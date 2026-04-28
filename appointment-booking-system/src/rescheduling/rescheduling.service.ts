import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { BookingService } from '../booking/booking.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { SchedulingType } from '../scheduling/enums/scheduling-type.enum';
import { UsersService } from '../users/users.service';
import { SlotsService } from '../slots/slots.service';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

@Injectable()
export class ReschedulingService {
  constructor(
    private readonly bookingService: BookingService,
    private readonly schedulingService: SchedulingService,
    private readonly usersService: UsersService,
    private readonly slotsService: SlotsService,
  ) {}

  async rescheduleAppointment(
    patientId: string,
    appointmentId: string,
    dto: RescheduleAppointmentDto,
  ) {
    const booking = await this.bookingService.findBookingById(appointmentId);

    if (booking.patient.id !== patientId) {
      throw new ForbiddenException(
        'You can only reschedule your own appointments',
      );
    }

    this.validateFutureDateTime(dto.newDate, dto.newStartTime);
    this.validateTimeRange(dto.newStartTime, dto.newEndTime);

    const doctor = await this.usersService.findById(booking.doctor.id);
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const schedulingConfig = await this.schedulingService.findConfigByDoctorId(
      doctor.id,
    );

    const schedulingType =
      schedulingConfig?.schedulingType ?? SchedulingType.STREAM;

    const resolvedSchedule =
      await this.slotsService.getResolvedAvailabilityForDateForInternalUse(
        doctor.id,
        dto.newDate,
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
          slot.startTime === dto.newStartTime &&
          slot.endTime === dto.newEndTime,
      );

      if (!matchingSlot) {
        throw new BadRequestException(
          'Selected stream slot is not available for rescheduling',
        );
      }

      const isBooked =
        await this.bookingService.isExactSlotBookedByAnotherAppointment(
          doctor.id,
          dto.newDate,
          dto.newStartTime,
          dto.newEndTime,
          booking.id,
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
          window.startTime === dto.newStartTime &&
          window.endTime === dto.newEndTime,
      );

      if (!matchingWave) {
        throw new BadRequestException(
          'Selected wave window is not available for rescheduling',
        );
      }

      const bookedCount =
        await this.bookingService.countOtherBookedWithinWindow(
          doctor.id,
          dto.newDate,
          dto.newStartTime,
          dto.newEndTime,
          booking.id,
        );

      if (bookedCount >= waveCapacity) {
        throw new BadRequestException(
          'Selected wave has already reached full capacity',
        );
      }
    }

    // old slot released + new slot reserved
    booking.bookingDate = dto.newDate;
    booking.startTime = dto.newStartTime;
    booking.endTime = dto.newEndTime;

    const updatedBooking = await this.bookingService.saveBooking(booking);

    return {
      id: updatedBooking.id,
      doctorId: updatedBooking.doctor.id,
      patientId: updatedBooking.patient.id,
      bookingDate: updatedBooking.bookingDate,
      startTime: updatedBooking.startTime,
      endTime: updatedBooking.endTime,
      status: updatedBooking.status,
      message: 'Appointment rescheduled successfully',
    };
  }

  private validateFutureDateTime(date: string, startTime: string) {
    const now = new Date();
    const requestedDateTime = new Date(`${date}T${startTime}:00`);

    if (requestedDateTime <= now) {
      throw new BadRequestException(
        'Cannot reschedule appointment to a past time',
      );
    }
  }

  private validateTimeRange(startTime: string, endTime: string) {
    if (startTime >= endTime) {
      throw new BadRequestException(
        'newStartTime must be earlier than newEndTime',
      );
    }
  }
}