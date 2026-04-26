import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';

import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';

import { DoctorSchedulingConfig } from './entities/doctor-scheduling-config.entity';
import { SchedulingService } from './scheduling.service';
import { SchedulingType } from './enums/scheduling-type.enum';

describe('SchedulingService', () => {
  let service: SchedulingService;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let usersService: { findById: jest.Mock };
  let queryBuilder: { leftJoinAndSelect: jest.Mock; where: jest.Mock; getOne: jest.Mock };

  const doctor = { id: 'doctor-id', role: Role.DOCTOR };

  beforeEach(async () => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    repository = {
      create: jest.fn((data) => data),
      save: jest.fn((data) =>
        Promise.resolve({
          id: 'config-id',
          doctor,
          createdAt: new Date('2099-01-01T00:00:00.000Z'),
          updatedAt: new Date('2099-01-01T00:00:00.000Z'),
          ...data,
        }),
      ),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    usersService = {
      findById: jest.fn().mockResolvedValue(doctor),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingService,
        {
          provide: getRepositoryToken(DoctorSchedulingConfig),
          useValue: repository,
        },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<SchedulingService>(SchedulingService);
  });

  it('should create stream scheduling configuration', async () => {
    const result = await service.createConfig('doctor-id', {
      schedulingType: SchedulingType.STREAM,
      slotDuration: 30,
      bufferTime: 5,
    });

    expect(repository.create).toHaveBeenCalledWith({
      doctor,
      schedulingType: SchedulingType.STREAM,
      slotDuration: 30,
      bufferTime: 5,
      waveCapacity: null,
    });
    expect(result).toMatchObject({
      id: 'config-id',
      doctorId: 'doctor-id',
      schedulingType: SchedulingType.STREAM,
    });
  });

  it('should throw when a config already exists', async () => {
    queryBuilder.getOne.mockResolvedValue({ id: 'config-id' });

    await expect(
      service.createConfig('doctor-id', {
        schedulingType: SchedulingType.WAVE,
        waveCapacity: 2,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should reject patient users', async () => {
    usersService.findById.mockResolvedValue({ id: 'patient-id', role: Role.PATIENT });

    await expect(
      service.createConfig('patient-id', {
        schedulingType: SchedulingType.STREAM,
        slotDuration: 30,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should validate stream slot duration', async () => {
    await expect(
      service.createConfig('doctor-id', {
        schedulingType: SchedulingType.STREAM,
        slotDuration: 4,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should update an existing config to wave scheduling', async () => {
    queryBuilder.getOne.mockResolvedValue({
      id: 'config-id',
      doctor,
      schedulingType: SchedulingType.STREAM,
      slotDuration: 30,
      bufferTime: 0,
      waveCapacity: null,
    });

    const result = await service.updateConfig('doctor-id', {
      schedulingType: SchedulingType.WAVE,
      waveCapacity: 4,
    });

    expect(result).toMatchObject({
      schedulingType: SchedulingType.WAVE,
      slotDuration: null,
      bufferTime: 0,
      waveCapacity: 4,
    });
  });

  it('should throw when updating missing config', async () => {
    await expect(
      service.updateConfig('doctor-id', { bufferTime: 5 }),
    ).rejects.toThrow(NotFoundException);
  });
});
