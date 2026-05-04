import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    if (!dto.slotStartTime) {
      throw new BadRequestException({
        message: 'slotStartTime is required. Please select an available slot before booking.',
        reason: 'SLOT_REQUIRED',
      });
    }

    const appointmentDate = dto.appointmentDate ?? this.getTodayDateString();
    const slotSelection = await this.validateSlotSelection({
      ...dto,
      appointmentDate,
    });
    const patientUser = await this.usersService.findById(patientUserId);

    if (!patientUser) {
      throw new NotFoundException('Patient user not found');
    }

    const tokenNumber = await this.getNextTokenNumber(
      slotSelection.doctor.id,
      slotSelection.appointmentDate,
    );

    const appointment = this.appointmentRepository.create({
      doctor: slotSelection.doctor,
      patientUser,
      patientPhoneNumber: dto.patientPhoneNumber,
      patientName: dto.patientName ?? null,
      reasonForVisit: dto.reasonForVisit ?? null,
      appointmentDate: slotSelection.appointmentDate,
      slotStartTime: slotSelection.selectedSlot.startTime,
      slotEndTime: slotSelection.selectedSlot.endTime,
      tokenNumber,
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

  async cancel(appointmentId: string, patientUserId: string) {
    const appointment = await this.appointmentRepository.findOne({
      where: {
        id: appointmentId,
        patientUser: { id: patientUserId },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.status !== 'BOOKED') {
      throw new BadRequestException('Only booked appointments can be cancelled');
    }

    appointment.status = 'CANCELLED';

    const savedAppointment = await this.appointmentRepository.save(appointment);
    return this.toAppointmentResponse(savedAppointment);
  }

  async findAll(
    patientUserId: string,
    doctorId?: string,
    appointmentDate?: string,
  ) {
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

    return appointments.map((appointment) =>
      this.toAppointmentResponse(appointment),
    );
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
      tokenNumber: appointment.tokenNumber,
      reportingTime: appointment.slotStartTime,
      status: appointment.status,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  }

  private async validateSlotSelection(
    dto: CreateAppointmentDto & { appointmentDate: string },
  ) {
    try {
      const { doctor, selectedSlot } =
        await this.doctorsService.validateSlotForBooking(
          dto.doctorId,
          dto.appointmentDate,
          dto.slotStartTime,
        );

      return {
        doctor,
        appointmentDate: dto.appointmentDate,
        selectedSlot,
      };
    } catch (error) {
      if (!(error instanceof BadRequestException)) {
        throw error;
      }

      const errorResponse = error.getResponse();
      const message =
        typeof errorResponse === 'object' &&
        errorResponse !== null &&
        'message' in errorResponse
          ? errorResponse.message
          : 'This slot is already booked.';
      const reason =
        typeof errorResponse === 'object' &&
        errorResponse !== null &&
        'reason' in errorResponse
          ? errorResponse.reason
          : 'SLOT_NOT_AVAILABLE';

      const nextSlot =
        await this.doctorsService.findNextAvailableSlotForBooking(
          dto.doctorId,
          dto.appointmentDate,
          dto.slotStartTime,
        );

      if (!nextSlot) {
        throw error;
      }

      const tokenNo = await this.getNextTokenNumber(
        nextSlot.doctor.id,
        nextSlot.appointmentDate,
      );

      throw new BadRequestException({
        message,
        reason,
        nextavailableDays: nextSlot.nextavailableDays,
        nextAvailableDate: nextSlot.appointmentDate,
        nextAvailableSlot: nextSlot.selectedSlot,
        tokenNo,
      });
    }
  }

  private async getNextTokenNumber(doctorId: string, appointmentDate: string) {
    const bookedAppointmentsCount = await this.appointmentRepository.count({
      where: {
        doctor: { id: doctorId },
        appointmentDate,
        status: 'BOOKED',
      },
    });

    return bookedAppointmentsCount + 1;
  }

  private getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = `${today.getMonth() + 1}`.padStart(2, '0');
    const day = `${today.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
