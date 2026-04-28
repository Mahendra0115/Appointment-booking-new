import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';

import { AvailabilityOverride } from '../availability/entities/availability-override.entity';
import { RecurringAvailability } from '../availability/entities/recurring-availability.entity';
import { BookingService } from '../booking/booking.service';
import { DayOfWeek } from '../availability/enums/day-of-week.enum';
import { SchedulingService } from '../scheduling/scheduling.service';
import { SchedulingType } from '../scheduling/enums/scheduling-type.enum';
import { UsersService } from '../users/users.service';

import { SlotsService } from './slots.service';

describe('SlotsService', () => {
  let service: SlotsService;
  let recurringRepository: { find: jest.Mock };
  let overrideRepository: { find: jest.Mock };
  let usersService: { findById: jest.Mock };
  let bookingService: {
    findBookedSlotsForDoctor: jest.Mock;
    countBookedWithinWindow: jest.Mock;
  };
  let schedulingService: { findConfigByDoctorId: jest.Mock };

  beforeEach(async () => {
    recurringRepository = {
      find: jest
        .fn()
        .mockResolvedValue([{ startTime: '09:00', endTime: '10:00' }]),
    };
    overrideRepository = {
      find: jest.fn().mockResolvedValue([]),
    };
    usersService = {
      findById: jest.fn().mockResolvedValue({ id: 'doctor-id' }),
    };
    bookingService = {
      findBookedSlotsForDoctor: jest.fn().mockResolvedValue([]),
      countBookedWithinWindow: jest.fn().mockResolvedValue(0),
    };
    schedulingService = {
      findConfigByDoctorId: jest.fn().mockResolvedValue({
        schedulingType: SchedulingType.STREAM,
        slotDuration: 30,
        bufferTime: 0,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlotsService,
        {
          provide: getRepositoryToken(RecurringAvailability),
          useValue: recurringRepository,
        },
        {
          provide: getRepositoryToken(AvailabilityOverride),
          useValue: overrideRepository,
        },
        { provide: UsersService, useValue: usersService },
        { provide: BookingService, useValue: bookingService },
        { provide: SchedulingService, useValue: schedulingService },
      ],
    }).compile();

    service = module.get<SlotsService>(SlotsService);
  });

  it('should return stream slots excluding already booked slots', async () => {
    bookingService.findBookedSlotsForDoctor.mockResolvedValue([
      { startTime: '09:00', endTime: '09:30' },
    ]);

    const result = await service.getAvailableSlotsForDoctor(
      'doctor-id',
      '2099-04-20',
    );

    expect(result).toEqual({
      doctorId: 'doctor-id',
      date: '2099-04-20',
      schedulingType: SchedulingType.STREAM,
      slotDuration: 30,
      bufferTime: 0,
      slots: [{ startTime: '09:30', endTime: '10:00' }],
    });
  });

  it('should prefer date overrides over recurring availability', async () => {
    overrideRepository.find.mockResolvedValue([
      { startTime: '11:00', endTime: '12:00' },
    ]);

    const windows = await service.getResolvedAvailabilityForDateForInternalUse(
      'doctor-id',
      '2099-04-20',
    );

    expect(windows).toEqual([{ startTime: '11:00', endTime: '12:00' }]);
    expect(recurringRepository.find).not.toHaveBeenCalled();
  });

  it('should return wave windows with remaining capacity', async () => {
    schedulingService.findConfigByDoctorId.mockResolvedValue({
      schedulingType: SchedulingType.WAVE,
      waveCapacity: 3,
    });
    bookingService.countBookedWithinWindow.mockResolvedValue(1);

    const result = await service.getAvailableSlotsForDoctor(
      'doctor-id',
      '2099-04-20',
    );

    expect(result).toMatchObject({
      schedulingType: SchedulingType.WAVE,
      waves: [
        {
          startTime: '09:00',
          endTime: '10:00',
          maxPatients: 3,
          bookedPatients: 1,
          remainingCapacity: 2,
        },
      ],
    });
  });

  it('should throw when doctor does not exist', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(
      service.getAvailableSlotsForDoctor('missing-doctor', '2099-04-20'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should calculate day of week when using recurring availability', async () => {
    await service.getResolvedAvailabilityForDateForInternalUse(
      'doctor-id',
      '2099-04-20',
    );

    expect(recurringRepository.find).toHaveBeenCalledWith({
      where: {
        doctor: { id: 'doctor-id' },
        dayOfWeek: DayOfWeek.MONDAY,
      },
      order: { startTime: 'ASC' },
    });
  });
});
