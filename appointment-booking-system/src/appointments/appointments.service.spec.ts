import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';

import { AppointmentRemindersService } from '../appointment-reminders/appointment-reminders.service';
import { Role } from '../common/enums/role.enum';
import { DoctorsService } from '../doctors/doctors.service';
import { UsersService } from '../users/users.service';

import { Appointment } from './entities/appointment.entity';
import { AppointmentsService } from './appointments.service';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let appointmentRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    count: jest.Mock;
  };
  let doctorsService: {
    validateSlotForBooking: jest.Mock;
    findNextAvailableSlotForBooking: jest.Mock;
  };
  let usersService: { findById: jest.Mock };
  let appointmentRemindersService: {
    createRemindersForAppointment: jest.Mock;
    cancelPendingRemindersForAppointment: jest.Mock;
  };

  const doctor = {
    id: 'doctor-id',
    doctorName: 'Dr. Meera Sharma',
  };
  const patientUser = {
    id: 'patient-user-id',
    role: Role.PATIENT,
  };
  const appointment = {
    id: 'appointment-id',
    doctor,
    patientUser,
    patientPhoneNumber: '9876543210',
    patientName: 'Rahul Verma',
    reasonForVisit: 'Consultation',
    appointmentDate: '2099-04-20',
    slotStartTime: '09:00',
    slotEndTime: '09:30',
    tokenNumber: 1,
    status: 'BOOKED',
    createdAt: new Date('2099-01-01T00:00:00.000Z'),
    updatedAt: new Date('2099-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    appointmentRepository = {
      create: jest.fn((data) => data),
      save: jest.fn((data) =>
        Promise.resolve({ id: 'appointment-id', ...data }),
      ),
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    };
    doctorsService = {
      validateSlotForBooking: jest.fn().mockResolvedValue({
        doctor,
        selectedSlot: { startTime: '09:00', endTime: '09:30' },
      }),
      findNextAvailableSlotForBooking: jest.fn(),
    };
    usersService = {
      findById: jest.fn().mockResolvedValue(patientUser),
    };
    appointmentRemindersService = {
      createRemindersForAppointment: jest.fn().mockResolvedValue(undefined),
      cancelPendingRemindersForAppointment: jest.fn().mockResolvedValue(
        undefined,
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: getRepositoryToken(Appointment),
          useValue: appointmentRepository,
        },
        {
          provide: DoctorsService,
          useValue: doctorsService,
        },
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: AppointmentRemindersService,
          useValue: appointmentRemindersService,
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  it('should create an appointment for a valid slot', async () => {
    const result = await service.create('patient-user-id', {
      doctorId: 'doctor-id',
      patientPhoneNumber: '9876543210',
      patientName: 'Rahul Verma',
      reasonForVisit: 'Consultation',
      appointmentDate: '2099-04-20',
      slotStartTime: '09:00',
    });

    expect(doctorsService.validateSlotForBooking).toHaveBeenCalledWith(
      'doctor-id',
      '2099-04-20',
      '09:00',
    );
    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        doctor,
        patientUser,
        patientPhoneNumber: '9876543210',
        slotStartTime: '09:00',
        slotEndTime: '09:30',
        status: 'BOOKED',
      }),
    );
    expect(result).toMatchObject({
      id: 'appointment-id',
      doctorId: 'doctor-id',
      doctorName: 'Dr. Meera Sharma',
      patientUserId: 'patient-user-id',
      patientPhoneNumber: '9876543210',
      appointmentDate: '2099-04-20',
      slotStartTime: '09:00',
      slotEndTime: '09:30',
      tokenNumber: 1,
      reportingTime: '09:00',
      status: 'BOOKED',
    });
    expect(
      appointmentRemindersService.createRemindersForAppointment,
    ).toHaveBeenCalledWith(expect.objectContaining({ id: 'appointment-id' }));
  });

  it('should suggest next available slot without booking when requested slot is unavailable', async () => {
    doctorsService.validateSlotForBooking.mockRejectedValue(
      new BadRequestException({
        message: 'This slot is already booked.',
        nextavailableDays: 'Monday',
        nextAvailableDate: '2099-04-20',
        nextAvailableSlot: { startTime: '09:30', endTime: '10:00' },
      }),
    );
    doctorsService.findNextAvailableSlotForBooking.mockResolvedValue({
      doctor,
      appointmentDate: '2099-04-20',
      selectedSlot: { startTime: '09:30', endTime: '10:00' },
      nextavailableDays: 'Monday',
    });
    appointmentRepository.count.mockResolvedValue(1);

    await expect(
      service.create('patient-user-id', {
        doctorId: 'doctor-id',
        patientPhoneNumber: '9876543210',
        appointmentDate: '2099-04-20',
        slotStartTime: '09:00',
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'This slot is already booked.',
        nextavailableDays: 'Monday',
        nextAvailableDate: '2099-04-20',
        nextAvailableSlot: { startTime: '09:30', endTime: '10:00' },
        tokenNo: 2,
      },
    });
    expect(doctorsService.findNextAvailableSlotForBooking).toHaveBeenCalledWith(
      'doctor-id',
      '2099-04-20',
      '09:00',
    );
    expect(appointmentRepository.create).not.toHaveBeenCalled();
    expect(appointmentRepository.save).not.toHaveBeenCalled();
  });

  it('should require patient to select a slot before booking', async () => {
    await expect(
      service.create('patient-user-id', {
        doctorId: 'doctor-id',
        patientPhoneNumber: '9876543210',
      } as any),
    ).rejects.toMatchObject({
      response: {
        message:
          'slotStartTime is required. Please select an available slot before booking.',
        reason: 'SLOT_REQUIRED',
      },
    });

    expect(doctorsService.validateSlotForBooking).not.toHaveBeenCalled();
    expect(doctorsService.findNextAvailableSlotForBooking).not.toHaveBeenCalled();
    expect(appointmentRepository.create).not.toHaveBeenCalled();
    expect(appointmentRepository.save).not.toHaveBeenCalled();
  });

  it('should throw when patient user is not found', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(
      service.create('missing-patient-id', {
        doctorId: 'doctor-id',
        patientPhoneNumber: '9876543210',
        appointmentDate: '2099-04-20',
        slotStartTime: '09:00',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should list patient appointments with optional filters', async () => {
    appointmentRepository.find.mockResolvedValue([appointment]);

    const result = await service.findAll(
      'patient-user-id',
      'doctor-id',
      '2099-04-20',
    );

    expect(appointmentRepository.find).toHaveBeenCalledWith({
      where: {
        patientUser: { id: 'patient-user-id' },
        doctor: { id: 'doctor-id' },
        appointmentDate: '2099-04-20',
      },
      order: {
        appointmentDate: 'ASC',
        slotStartTime: 'ASC',
      },
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'appointment-id',
      doctorId: 'doctor-id',
      patientUserId: 'patient-user-id',
    });
  });

  it('should cancel a booked appointment for the patient', async () => {
    appointmentRepository.findOne.mockResolvedValue({ ...appointment });

    const result = await service.cancel('appointment-id', 'patient-user-id');

    expect(appointmentRepository.findOne).toHaveBeenCalledWith({
      where: {
        id: 'appointment-id',
        patientUser: { id: 'patient-user-id' },
      },
    });
    expect(appointmentRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'appointment-id',
        status: 'CANCELLED',
      }),
    );
    expect(result).toMatchObject({
      id: 'appointment-id',
      patientUserId: 'patient-user-id',
      status: 'CANCELLED',
    });
    expect(
      appointmentRemindersService.cancelPendingRemindersForAppointment,
    ).toHaveBeenCalledWith('appointment-id');
  });

  it('should not cancel an appointment that is not booked', async () => {
    appointmentRepository.findOne.mockResolvedValue({
      ...appointment,
      status: 'CANCELLED',
    });

    await expect(
      service.cancel('appointment-id', 'patient-user-id'),
    ).rejects.toThrow(BadRequestException);

    expect(appointmentRepository.save).not.toHaveBeenCalled();
  });

  it('should throw when appointment is not found for patient', async () => {
    appointmentRepository.findOne.mockResolvedValue(null);

    await expect(
      service.findOne('missing-appointment-id', 'patient-user-id'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should confirm a booked appointment for the patient', async () => {
    appointmentRepository.findOne.mockResolvedValue({ ...appointment });

    const result = await service.confirm('appointment-id', 'patient-user-id');

    expect(appointmentRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'appointment-id',
        status: 'CONFIRMED',
      }),
    );
    expect(result).toMatchObject({
      id: 'appointment-id',
      patientUserId: 'patient-user-id',
      status: 'CONFIRMED',
    });
  });

  it('should not confirm a cancelled appointment', async () => {
    appointmentRepository.findOne.mockResolvedValue({
      ...appointment,
      status: 'CANCELLED',
    });

    await expect(
      service.confirm('appointment-id', 'patient-user-id'),
    ).rejects.toThrow(BadRequestException);
  });
});
