import {
  BadRequestException,
  Injectable,
  NotFoundException,
   Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AppointmentBooking } from './entities/appointment-booking.entity';
import { UsersService } from '../users/users.service';
import { SlotsService } from '../slots/slots.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { SchedulingType } from '../scheduling/enums/scheduling-type.enum';
import { CreateAppointmentBookingDto } from './dto/create-appointment-booking.dto';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(AppointmentBooking)
    private readonly appointmentBookingRepository: Repository<AppointmentBooking>,
    private readonly usersService: UsersService,

    @Inject(forwardRef(() => SlotsService))
  private readonly slotsService: SlotsService,
    // private readonly slotsService: SlotsService,
    private readonly schedulingService: SchedulingService,
  ) {}

  async createAppointment(patientId: string, dto: CreateAppointmentBookingDto) {
    const doctor = await this.usersService.findById(dto.doctorId);
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const patient = await this.usersService.findById(patientId);
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    this.validateFutureDateTime(dto.bookingDate, dto.startTime);
    this.validateTimeRange(dto.startTime, dto.endTime);

    const schedulingConfig = await this.schedulingService.findConfigByDoctorId(
      dto.doctorId,
    );

    const schedulingType =
      schedulingConfig?.schedulingType ?? SchedulingType.STREAM;

    const resolvedSchedule =
      await this.slotsService.getResolvedAvailabilityForDateForInternalUse(
        dto.doctorId,
        dto.bookingDate,
      );

    if (schedulingType === SchedulingType.STREAM) {
      const slotDuration = schedulingConfig?.slotDuration ?? 15;
      const bufferTime = schedulingConfig?.bufferTime ?? 0;

      const generatedSlots =
        this.slotsService.generateStreamSlotsFromWindowsForInternalUse(
          resolvedSchedule,
          slotDuration,
          bufferTime,
        );

      const matchingSlot = generatedSlots.find(
        (slot) =>
          slot.startTime === dto.startTime && slot.endTime === dto.endTime,
      );

      if (!matchingSlot) {
        throw new BadRequestException(
          'Selected stream slot is not available for booking',
        );
      }

      const isBooked = await this.isExactSlotBookedByAnotherAppointment(
        dto.doctorId,
        dto.bookingDate,
        dto.startTime,
        dto.endTime,
        '',
      );

      if (isBooked) {
        throw new BadRequestException(
          'Selected stream slot is already booked',
        );
      }
    } else {
      const waveCapacity = schedulingConfig?.waveCapacity ?? 1;

      const matchingWave = resolvedSchedule.find(
        (window) =>
          window.startTime === dto.startTime &&
          window.endTime === dto.endTime,
      );

      if (!matchingWave) {
        throw new BadRequestException(
          'Selected wave window is not available for booking',
        );
      }

      const bookedCount = await this.countBookedWithinWindow(
        dto.doctorId,
        dto.bookingDate,
        dto.startTime,
        dto.endTime,
      );

      if (bookedCount >= waveCapacity) {
        throw new BadRequestException(
          'Selected wave has already reached full capacity',
        );
      }
    }

    const booking = this.appointmentBookingRepository.create({
      doctor,
      patient,
      bookingDate: dto.bookingDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      status: 'BOOKED',
    });

    const savedBooking = await this.appointmentBookingRepository.save(booking);

    return {
      id: savedBooking.id,
      doctorId: savedBooking.doctor.id,
      patientId: savedBooking.patient.id,
      bookingDate: savedBooking.bookingDate,
      startTime: savedBooking.startTime,
      endTime: savedBooking.endTime,
      status: savedBooking.status,
      createdAt: savedBooking.createdAt,
      updatedAt: savedBooking.updatedAt,
    };
  }

  async findBookedSlotsForDoctor(doctorId: string, bookingDate: string) {
    return this.appointmentBookingRepository.find({
      where: {
        doctor: { id: doctorId },
        bookingDate,
        status: 'BOOKED',
      },
    });
  }

  async countBookedWithinWindow(
    doctorId: string,
    bookingDate: string,
    windowStartTime: string,
    windowEndTime: string,
  ) {
    const bookedAppointments = await this.appointmentBookingRepository.find({
      where: {
        doctor: { id: doctorId },
        bookingDate,
        status: 'BOOKED',
      },
    });

    return bookedAppointments.filter(
      (booking) =>
        booking.startTime >= windowStartTime && booking.endTime <= windowEndTime,
    ).length;
  }

  async findBookingById(appointmentId: string) {
    const booking = await this.appointmentBookingRepository.findOne({
      where: { id: appointmentId },
    });

    if (!booking) {
      throw new NotFoundException('Appointment booking not found');
    }

    return booking;
  }

  async saveBooking(booking: AppointmentBooking) {
    return this.appointmentBookingRepository.save(booking);
  }

  async countOtherBookedWithinWindow(
    doctorId: string,
    bookingDate: string,
    windowStartTime: string,
    windowEndTime: string,
    ignoreBookingId: string,
  ) {
    const bookedAppointments = await this.appointmentBookingRepository.find({
      where: {
        doctor: { id: doctorId },
        bookingDate,
        status: 'BOOKED',
      },
    });

    return bookedAppointments.filter(
      (booking) =>
        booking.id !== ignoreBookingId &&
        booking.startTime >= windowStartTime &&
        booking.endTime <= windowEndTime,
    ).length;
  }

  async isExactSlotBookedByAnotherAppointment(
    doctorId: string,
    bookingDate: string,
    startTime: string,
    endTime: string,
    ignoreBookingId: string,
  ) {
    const bookedAppointments = await this.appointmentBookingRepository.find({
      where: {
        doctor: { id: doctorId },
        bookingDate,
        status: 'BOOKED',
      },
    });

    return bookedAppointments.some(
      (booking) =>
        booking.id !== ignoreBookingId &&
        booking.startTime === startTime &&
        booking.endTime === endTime,
    );
  }

  private validateFutureDateTime(date: string, startTime: string) {
    const now = new Date();
    const requestedDateTime = new Date(`${date}T${startTime}:00`);

    if (requestedDateTime <= now) {
      throw new BadRequestException(
        'Cannot create appointment for a past time',
      );
    }
  }

  private validateTimeRange(startTime: string, endTime: string) {
    if (startTime >= endTime) {
      throw new BadRequestException(
        'startTime must be earlier than endTime',
      );
    }
  }
}