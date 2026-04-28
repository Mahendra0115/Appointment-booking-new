import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';

import { SchedulingType } from '../scheduling/enums/scheduling-type.enum';
import { SchedulingService } from '../scheduling/scheduling.service';
import { SlotsService } from '../slots/slots.service';
import { UsersService } from '../users/users.service';

import { AppointmentBooking } from './entities/appointment-booking.entity';
import { BookingService } from './booking.service';

describe('BookingService', () => {
  let service: BookingService;
  let bookingRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let usersService: { findById: jest.Mock };
  let slotsService: {
    getResolvedAvailabilityForDateForInternalUse: jest.Mock;
    generateStreamSlotsFromWindowsForInternalUse: jest.Mock;
  };
  let schedulingService: { findConfigByDoctorId: jest.Mock };

  const doctor = { id: 'doctor-id' };
  const patient = { id: 'patient-id' };
  const baseDto = {
    doctorId: 'doctor-id',
    bookingDate: '2099-04-20',
    startTime: '09:00',
    endTime: '09:30',
  };

  beforeEach(async () => {
    bookingRepository = {
      create: jest.fn((data) => data),
      save: jest.fn((data) =>
        Promise.resolve({
          id: 'booking-id',
          createdAt: new Date('2099-01-01T00:00:00.000Z'),
          updatedAt: new Date('2099-01-01T00:00:00.000Z'),
          ...data,
        }),
      ),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };
    usersService = {
      findById: jest.fn((id: string) =>
        Promise.resolve(id === 'doctor-id' ? doctor : patient),
      ),
    };
    slotsService = {
      getResolvedAvailabilityForDateForInternalUse: jest
        .fn()
        .mockResolvedValue([{ startTime: '09:00', endTime: '10:00' }]),
      generateStreamSlotsFromWindowsForInternalUse: jest
        .fn()
        .mockReturnValue([{ startTime: '09:00', endTime: '09:30' }]),
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
        BookingService,
        {
          provide: getRepositoryToken(AppointmentBooking),
          useValue: bookingRepository,
        },
        { provide: UsersService, useValue: usersService },
        { provide: SlotsService, useValue: slotsService },
        { provide: SchedulingService, useValue: schedulingService },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  it('should create a stream appointment when the selected slot is available', async () => {
    const result = await service.createAppointment('patient-id', baseDto);

    expect(slotsService.generateStreamSlotsFromWindowsForInternalUse).toHaveBeenCalledWith(
      [{ startTime: '09:00', endTime: '10:00' }],
      30,
      0,
    );
    expect(bookingRepository.create).toHaveBeenCalledWith({
      doctor,
      patient,
      bookingDate: '2099-04-20',
      startTime: '09:00',
      endTime: '09:30',
      status: 'BOOKED',
    });
    expect(result).toMatchObject({
      id: 'booking-id',
      doctorId: 'doctor-id',
      patientId: 'patient-id',
      status: 'BOOKED',
    });
  });

  it('should throw when selected stream slot is already booked', async () => {
    bookingRepository.find.mockResolvedValue([
      { id: 'other-id', startTime: '09:00', endTime: '09:30' },
    ]);

    await expect(
      service.createAppointment('patient-id', baseDto),
    ).rejects.toThrow(BadRequestException);
  });

  it('should create a wave appointment when capacity is available', async () => {
    schedulingService.findConfigByDoctorId.mockResolvedValue({
      schedulingType: SchedulingType.WAVE,
      waveCapacity: 2,
    });
    slotsService.getResolvedAvailabilityForDateForInternalUse.mockResolvedValue([
      { startTime: '09:00', endTime: '10:00' },
    ]);

    const result = await service.createAppointment('patient-id', {
      ...baseDto,
      endTime: '10:00',
    });

    expect(result).toMatchObject({
      doctorId: 'doctor-id',
      patientId: 'patient-id',
      startTime: '09:00',
      endTime: '10:00',
    });
  });

  it('should throw when doctor is not found', async () => {
    usersService.findById.mockResolvedValueOnce(null);

    await expect(
      service.createAppointment('patient-id', baseDto),
    ).rejects.toThrow(NotFoundException);
  });

  it('should count booked appointments inside a wave window', async () => {
    bookingRepository.find.mockResolvedValue([
      { id: 'one', startTime: '09:00', endTime: '09:30' },
      { id: 'two', startTime: '09:30', endTime: '10:00' },
      { id: 'three', startTime: '10:00', endTime: '10:30' },
    ]);

    await expect(
      service.countBookedWithinWindow('doctor-id', '2099-04-20', '09:00', '10:00'),
    ).resolves.toBe(2);
  });
});
