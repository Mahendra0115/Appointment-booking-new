import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';

import { Appointment } from '../appointments/entities/appointment.entity';
import { DayOfWeek } from '../availability/enums/day-of-week.enum';
import { ClinicClosure } from '../clinic-closures/entities/clinic-closure.entity';
import { Role } from '../common/enums/role.enum';
import { DoctorLeave } from '../doctor-leaves/entities/doctor-leave.entity';
import { UsersService } from '../users/users.service';

import { Doctor } from './entities/doctor.entity';
import { DoctorsService } from './doctors.service';

describe('DoctorsService', () => {
  let service: DoctorsService;
  let doctorRepository: { findOne: jest.Mock };
  let appointmentRepository: { find: jest.Mock };
  let doctorLeaveRepository: { find: jest.Mock };
  let clinicClosureRepository: { find: jest.Mock };

  const doctor = {
    id: 'doctor-id',
    user: {
      id: 'doctor-user-id',
      role: Role.DOCTOR,
    },
    doctorName: 'Dr. Meera Sharma',
    specialization: 'Cardiology',
    availableDays: [
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ],
    weeklyOffDays: [DayOfWeek.SUNDAY],
    consultingStartTime: '09:00',
    consultingEndTime: '10:00',
    slotDurationMinutes: 30,
    totalAppointmentsPerDay: null,
    nextAvailableSearchDays: 7,
    createdAt: new Date('2099-01-01T00:00:00.000Z'),
    updatedAt: new Date('2099-01-01T00:00:00.000Z'),
  } as Doctor;

  const bookedAppointment = (slotStartTime: string) =>
    ({
      slotStartTime,
      status: 'BOOKED',
    }) as Appointment;

  beforeEach(async () => {
    doctorRepository = {
      findOne: jest.fn().mockResolvedValue(doctor),
    };
    appointmentRepository = {
      find: jest.fn(),
    };
    doctorLeaveRepository = {
      find: jest.fn().mockResolvedValue([]),
    };
    clinicClosureRepository = {
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorsService,
        {
          provide: getRepositoryToken(Doctor),
          useValue: doctorRepository,
        },
        {
          provide: getRepositoryToken(Appointment),
          useValue: appointmentRepository,
        },
        {
          provide: getRepositoryToken(DoctorLeave),
          useValue: doctorLeaveRepository,
        },
        {
          provide: getRepositoryToken(ClinicClosure),
          useValue: clinicClosureRepository,
        },
        {
          provide: UsersService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<DoctorsService>(DoctorsService);
  });

  it('should return requested date schedule when slots are available', async () => {
    appointmentRepository.find.mockResolvedValue([]);

    const result = await service.getAvailability('doctor-id', '2099-04-20', 7);

    expect(result.nextAvailableDate).toBe('2099-04-20');
    expect(result.nextAvailableSlot).toEqual({
      startTime: '09:00',
      endTime: '09:30',
    });
    expect(result.schedule.availableSlots).toBe(2);
    expect(result.schedule.slots).toEqual([
      { startTime: '09:00', endTime: '09:30' },
      { startTime: '09:30', endTime: '10:00' },
    ]);
  });

  it('should expose next available appointment details', async () => {
    appointmentRepository.find.mockResolvedValue([]);

    const result = await service.getNextAvailable('doctor-id', '2099-04-20', 7);

    expect(result).toMatchObject({
      fromDate: '2099-04-20',
      nextAvailableDate: '2099-04-20',
      nextAvailableSlot: {
        startTime: '09:00',
        endTime: '09:30',
      },
      searchedDays: 1,
    });
    expect(result).not.toHaveProperty('schedule');
  });

  it('should return available slots for a selected date', async () => {
    appointmentRepository.find.mockResolvedValue([
      bookedAppointment('09:00'),
    ]);

    const result = await service.getSlots('doctor-id', '2099-04-20');

    expect(result).toMatchObject({
      date: '2099-04-20',
      totalSlots: 2,
      bookedSlots: 1,
      availableSlots: 1,
      slots: [{ startTime: '09:30', endTime: '10:00' }],
    });
  });

  it('should suggest only first slot from next available working day', async () => {
    appointmentRepository.find.mockImplementation(({ where }) => {
      if (where.appointmentDate === '2099-04-25') {
        return Promise.resolve([
          bookedAppointment('09:00'),
          bookedAppointment('09:30'),
        ]);
      }

      return Promise.resolve([]);
    });

    const result = await service.getAvailability('doctor-id', '2099-04-25', 7);

    expect(result.nextAvailableDate).toBe('2099-04-27');
    expect(result.nextAvailableSlot).toEqual({
      startTime: '09:00',
      endTime: '09:30',
    });
    expect(result.searchedDays).toBe(3);
    expect(result.schedule.availableSlots).toBe(1);
    expect(result.schedule.slots).toEqual([
      { startTime: '09:00', endTime: '09:30' },
    ]);
  });

  it('should return fallback when no slot is available in search window', async () => {
    appointmentRepository.find.mockResolvedValue([
      bookedAppointment('09:00'),
      bookedAppointment('09:30'),
    ]);

    const result = await service.getAvailability('doctor-id', '2099-04-25', 2);

    expect(result.nextAvailableDate).toBeNull();
    expect(result.nextAvailableSlot).toBeNull();
    expect(result.searchedDays).toBe(2);
    expect(result.message).toBe(
      'Appointments are fully booked on selected date. No appointments available in the next 2 days. Please contact clinic.',
    );
    expect(result.schedule.availableSlots).toBe(0);
  });

  it('should include single next available slot when selected slot is unavailable', async () => {
    appointmentRepository.find.mockImplementation(({ where }) => {
      if (where.appointmentDate === '2099-04-20') {
        return Promise.resolve([bookedAppointment('09:00')]);
      }

      return Promise.resolve([]);
    });

    await expect(
      service.validateSlotForBooking('doctor-id', '2099-04-20', '09:00'),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.validateSlotForBooking('doctor-id', '2099-04-20', '09:00'),
    ).rejects.toMatchObject({
      response: {
        message: 'This slot is already booked.',
        nextavailableDays: 'Monday',
        nextAvailableDate: '2099-04-20',
        nextAvailableSlot: {
          startTime: '09:30',
          endTime: '10:00',
        },
      },
    });
  });

  it('should skip dates when doctor is on full-day leave', async () => {
    doctorLeaveRepository.find.mockImplementation(({ where }) => {
      if (where.startDate._value === '2099-04-20') {
        return Promise.resolve([{ isFullDay: true }]);
      }

      return Promise.resolve([]);
    });
    appointmentRepository.find.mockResolvedValue([]);

    const result = await service.getAvailability('doctor-id', '2099-04-20', 7);

    expect(result.nextAvailableDate).toBe('2099-04-21');
    expect(result.nextAvailableSlot).toEqual({
      startTime: '09:00',
      endTime: '09:30',
    });
    expect(result.schedule.availableSlots).toBe(1);
  });

  it('should skip dates when clinic is closed full day', async () => {
    clinicClosureRepository.find.mockImplementation(({ where }) => {
      if (where.startDate._value === '2099-04-20') {
        return Promise.resolve([{ isFullDay: true }]);
      }

      return Promise.resolve([]);
    });
    appointmentRepository.find.mockResolvedValue([]);

    const result = await service.getAvailability('doctor-id', '2099-04-20', 7);

    expect(result.nextAvailableDate).toBe('2099-04-21');
    expect(result.nextAvailableSlot).toEqual({
      startTime: '09:00',
      endTime: '09:30',
    });
    expect(result.schedule.availableSlots).toBe(1);
  });
});
