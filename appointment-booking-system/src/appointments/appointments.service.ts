import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DoctorsService } from '../doctors/doctors.service';
import { UsersService } from '../users/users.service';

import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { Appointment } from './entities/appointment.entity';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly doctorsService: DoctorsService,
    private readonly usersService: UsersService,
  ) {}

  async create(patientUserId: string, dto: CreateAppointmentDto) {
    const { doctor, selectedSlot } = await this.doctorsService.validateSlotForBooking(
      dto.doctorId,
      dto.appointmentDate,
      dto.slotStartTime,
    );
    const patientUser = await this.usersService.findById(patientUserId);

    if (!patientUser) {
      throw new NotFoundException('Patient user not found');
    }

    const appointment = this.appointmentRepository.create({
      doctor,
      patientUser,
      patientPhoneNumber: dto.patientPhoneNumber,
      patientName: dto.patientName ?? null,
      reasonForVisit: dto.reasonForVisit ?? null,
      appointmentDate: dto.appointmentDate,
      slotStartTime: selectedSlot.startTime,
      slotEndTime: selectedSlot.endTime,
      status: 'BOOKED',
    });

    const savedAppointment = await this.appointmentRepository.save(appointment);

    return this.toAppointmentResponse(savedAppointment);
  }

  async findOne(appointmentId: string, patientUserId: string) {
    const appointment = await this.appointmentRepository.findOne({
      where: {
        id: appointmentId,
        patientUser: { id: patientUserId },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return this.toAppointmentResponse(appointment);
  }

  async findAll(patientUserId: string, doctorId?: string, appointmentDate?: string) {
    const appointments = await this.appointmentRepository.find({
      where: {
        patientUser: { id: patientUserId },
        ...(doctorId ? { doctor: { id: doctorId } } : {}),
        ...(appointmentDate ? { appointmentDate } : {}),
      },
      order: {
        appointmentDate: 'ASC',
        slotStartTime: 'ASC',
      },
    });

    return appointments.map((appointment) => this.toAppointmentResponse(appointment));
  }

  private toAppointmentResponse(appointment: Appointment) {
    return {
      id: appointment.id,
      doctorId: appointment.doctor.id,
      doctorName: appointment.doctor.doctorName,
      patientUserId: appointment.patientUser.id,
      patientPhoneNumber: appointment.patientPhoneNumber,
      patientName: appointment.patientName,
      reasonForVisit: appointment.reasonForVisit,
      appointmentDate: appointment.appointmentDate,
      slotStartTime: appointment.slotStartTime,
      slotEndTime: appointment.slotEndTime,
      status: appointment.status,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  }
}
