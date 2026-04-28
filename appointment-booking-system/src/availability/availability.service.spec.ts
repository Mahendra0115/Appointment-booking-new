import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';

import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';

import { AvailabilityOverride } from './entities/availability-override.entity';
import { AvailabilityService } from './availability.service';
import { DayOfWeek } from './enums/day-of-week.enum';
import { RecurringAvailability } from './entities/recurring-availability.entity';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let recurringRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let overrideRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let usersService: { findById: jest.Mock };

  const doctor = { id: 'doctor-id', role: Role.DOCTOR };
  const savedRecurring = {
    id: 'recurring-id',
    doctor,
    dayOfWeek: DayOfWeek.MONDAY,
    startTime: '09:00',
    endTime: '10:00',
    createdAt: new Date('2099-01-01T00:00:00.000Z'),
    updatedAt: new Date('2099-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    recurringRepository = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ ...savedRecurring, ...data })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };
    overrideRepository = {
      create: jest.fn((data) => data),
      save: jest.fn((data) =>
        Promise.resolve({
          id: 'override-id',
          doctor,
          overrideDate: '2099-04-20',
          createdAt: new Date('2099-01-01T00:00:00.000Z'),
          updatedAt: new Date('2099-01-01T00:00:00.000Z'),
          ...data,
        }),
      ),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };
    usersService = {
      findById: jest.fn().mockResolvedValue(doctor),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        {
          provide: getRepositoryToken(RecurringAvailability),
          useValue: recurringRepository,
        },
        {
          provide: getRepositoryToken(AvailabilityOverride),
          useValue: overrideRepository,
        },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
  });

  it('should create recurring availability for a doctor', async () => {
    const result = await service.createRecurringAvailability('doctor-id', {
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '09:00',
      endTime: '10:00',
    });

    expect(recurringRepository.create).toHaveBeenCalledWith({
      doctor,
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(result).toMatchObject({
      id: 'recurring-id',
      doctorId: 'doctor-id',
      dayOfWeek: DayOfWeek.MONDAY,
    });
  });

  it('should reject overlapping recurring availability', async () => {
    recurringRepository.find.mockResolvedValue([
      { startTime: '09:30', endTime: '10:30' },
    ]);

    await expect(
      service.createRecurringAvailability('doctor-id', {
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00',
        endTime: '10:00',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject non-doctor users', async () => {
    usersService.findById.mockResolvedValue({ id: 'patient-id', role: Role.PATIENT });

    await expect(
      service.createRecurringAvailability('patient-id', {
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00',
        endTime: '10:00',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should update an availability override', async () => {
    overrideRepository.findOne.mockResolvedValue({
      id: 'override-id',
      doctor,
      overrideDate: '2099-04-20',
      startTime: '09:00',
      endTime: '10:00',
    });

    const result = await service.updateAvailabilityOverride('doctor-id', 'override-id', {
      startTime: '10:00',
      endTime: '11:00',
    });

    expect(result).toMatchObject({
      id: 'override-id',
      doctorId: 'doctor-id',
      overrideDate: '2099-04-20',
      startTime: '10:00',
      endTime: '11:00',
    });
  });

  it('should throw when recurring availability is not found for update', async () => {
    recurringRepository.findOne.mockResolvedValue(null);

    await expect(
      service.updateRecurringAvailability('doctor-id', 'missing-id', {
        startTime: '10:00',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
