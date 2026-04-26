import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { BookingService } from '../booking/booking.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { SchedulingType } from '../scheduling/enums/scheduling-type.enum';
import { SlotsService } from '../slots/slots.service';
import { UsersService } from '../users/users.service';

import { ReschedulingService } from './rescheduling.service';

describe('ReschedulingService', () => {
  let service: ReschedulingService;
  let bookingService: {
    findBookingById: jest.Mock;
    isExactSlotBookedByAnotherAppointment: jest.Mock;
    countOtherBookedWithinWindow: jest.Mock;
    saveBooking: jest.Mock;
  };
  let schedulingService: { findConfigByDoctorId: jest.Mock };
  let usersService: { findById: jest.Mock };
  let slotsService: {
    getResolvedAvailabilityForDateForInternalUse: jest.Mock;
    generateStreamSlotsFromWindowsForInternalUse: jest.Mock;
  };

  const booking = {
    id: 'booking-id',
    doctor: { id: 'doctor-id' },
    patient: { id: 'patient-id' },
    bookingDate: '2099-04-20',
    startTime: '09:00',
    endTime: '09:30',
    status: 'BOOKED',
  };
  const dto = {
    newDate: '2099-04-21',
    newStartTime: '10:00',
    newEndTime: '10:30',
  };

  beforeEach(async () => {
    bookingService = {
      findBookingById: jest.fn().mockResolvedValue({ ...booking }),
      isExactSlotBookedByAnotherAppointment: jest.fn().mockResolvedValue(false),
      countOtherBookedWithinWindow: jest.fn().mockResolvedValue(0),
      saveBooking: jest.fn((data) => Promise.resolve(data)),
    };
    schedulingService = {
      findConfigByDoctorId: jest.fn().mockResolvedValue({
        schedulingType: SchedulingType.STREAM,
        slotDuration: 30,
        bufferTime: 0,
      }),
    };
    usersService = {
      findById: jest.fn().mockResolvedValue({ id: 'doctor-id' }),
    };
    slotsService = {
      getResolvedAvailabilityForDateForInternalUse: jest
        .fn()
        .mockResolvedValue([{ startTime: '10:00', endTime: '11:00' }]),
      generateStreamSlotsFromWindowsForInternalUse: jest
        .fn()
        .mockReturnValue([{ startTime: '10:00', endTime: '10:30' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReschedulingService,
        { provide: BookingService, useValue: bookingService },
        { provide: SchedulingService, useValue: schedulingService },
        { provide: UsersService, useValue: usersService },
        { provide: SlotsService, useValue: slotsService },
      ],
    }).compile();

    service = module.get<ReschedulingService>(ReschedulingService);
  });

  it('should reschedule a stream appointment when the new slot is available', async () => {
    const result = await service.rescheduleAppointment(
      'patient-id',
      'booking-id',
      dto,
    );

    expect(bookingService.saveBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingDate: '2099-04-21',
        startTime: '10:00',
        endTime: '10:30',
      }),
    );
    expect(result).toMatchObject({
      id: 'booking-id',
      doctorId: 'doctor-id',
      patientId: 'patient-id',
      message: 'Appointment rescheduled successfully',
    });
  });

  it('should reject appointments owned by another patient', async () => {
    await expect(
      service.rescheduleAppointment('other-patient-id', 'booking-id', dto),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should reject unavailable stream slots', async () => {
    slotsService.generateStreamSlotsFromWindowsForInternalUse.mockReturnValue([]);

    await expect(
      service.rescheduleAppointment('patient-id', 'booking-id', dto),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject wave reschedule when capacity is full', async () => {
    schedulingService.findConfigByDoctorId.mockResolvedValue({
      schedulingType: SchedulingType.WAVE,
      waveCapacity: 1,
    });
    slotsService.getResolvedAvailabilityForDateForInternalUse.mockResolvedValue([
      { startTime: '10:00', endTime: '10:30' },
    ]);
    bookingService.countOtherBookedWithinWindow.mockResolvedValue(1);

    await expect(
      service.rescheduleAppointment('patient-id', 'booking-id', dto),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw when doctor no longer exists', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(
      service.rescheduleAppointment('patient-id', 'booking-id', dto),
    ).rejects.toThrow(NotFoundException);
  });
});
