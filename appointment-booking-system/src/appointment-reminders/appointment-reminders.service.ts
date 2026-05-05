import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Repository } from 'typeorm';

import { Appointment } from '../appointments/entities/appointment.entity';

import { AppointmentEmailService } from './appointment-email.service';
import {
  AppointmentReminder,
  AppointmentReminderStatus,
  AppointmentReminderType,
} from './entities/appointment-reminder.entity';

@Injectable()
export class AppointmentRemindersService {
  private readonly logger = new Logger(AppointmentRemindersService.name);

  constructor(
    @InjectRepository(AppointmentReminder)
    private readonly appointmentReminderRepository: Repository<AppointmentReminder>,
    private readonly appointmentEmailService: AppointmentEmailService,
  ) {}

  async createRemindersForAppointment(appointment: Appointment) {
    const now = new Date();
    const remindersToCreate = [
      {
        reminderType: AppointmentReminderType.BOOKING_CONFIRMATION,
        scheduledAt: now,
      },
      {
        reminderType: AppointmentReminderType.REMINDER_24H,
        scheduledAt: this.addHoursToAppointment(appointment, -24),
      },
      {
        reminderType: AppointmentReminderType.REMINDER_3H,
        scheduledAt: this.addHoursToAppointment(appointment, -3),
      },
    ].filter(
      (reminder) =>
        reminder.reminderType ===
          AppointmentReminderType.BOOKING_CONFIRMATION ||
        reminder.scheduledAt > now,
    );

    const reminders = remindersToCreate.map(({ reminderType, scheduledAt }) =>
      this.appointmentReminderRepository.create({
        appointment,
        reminderType,
        scheduledAt,
        status: AppointmentReminderStatus.PENDING,
      }),
    );

    const savedReminders = await this.appointmentReminderRepository.save(
      reminders,
    );

    const confirmationReminder = savedReminders.find(
      (reminder) =>
        reminder.reminderType ===
        AppointmentReminderType.BOOKING_CONFIRMATION,
    );

    if (confirmationReminder) {
      await this.sendReminder(confirmationReminder);
    }
  }

  async cancelPendingRemindersForAppointment(appointmentId: string) {
    const reminders = await this.appointmentReminderRepository.find({
      where: {
        appointment: { id: appointmentId },
        status: In([
          AppointmentReminderStatus.PENDING,
          AppointmentReminderStatus.FAILED,
        ]),
      },
    });

    if (reminders.length === 0) {
      return;
    }

    reminders.forEach((reminder) => {
      reminder.status = AppointmentReminderStatus.CANCELLED;
      reminder.failureReason = null;
    });

    await this.appointmentReminderRepository.save(reminders);
  }

  @Cron('0 */5 * * * *')
  async processPendingReminders() {
    const reminders = await this.appointmentReminderRepository.find({
      where: {
        status: AppointmentReminderStatus.PENDING,
        scheduledAt: LessThanOrEqual(new Date()),
      },
      order: {
        scheduledAt: 'ASC',
      },
      take: 25,
    });

    for (const reminder of reminders) {
      await this.sendReminder(reminder);
    }
  }

  private async sendReminder(reminder: AppointmentReminder) {
    if (
      reminder.appointment.status !== 'BOOKED' &&
      reminder.appointment.status !== 'CONFIRMED'
    ) {
      reminder.status = AppointmentReminderStatus.CANCELLED;
      reminder.failureReason = null;
      await this.appointmentReminderRepository.save(reminder);
      return;
    }

    const result = await this.appointmentEmailService.sendAppointmentEmail(
      reminder.appointment,
      reminder.reminderType,
    );

    if (result.sent) {
      reminder.status = AppointmentReminderStatus.SENT;
      reminder.sentAt = new Date();
      reminder.failureReason = null;
    } else {
      reminder.status = AppointmentReminderStatus.FAILED;
      reminder.failureReason = result.reason;
      this.logger.warn(
        `Reminder ${reminder.id} was not sent: ${result.reason}`,
      );
    }

    await this.appointmentReminderRepository.save(reminder);
  }

  private addHoursToAppointment(appointment: Appointment, hours: number) {
    const appointmentDateTime = new Date(
      `${appointment.appointmentDate}T${appointment.slotStartTime}`,
    );

    appointmentDateTime.setHours(appointmentDateTime.getHours() + hours);

    return appointmentDateTime;
  }
}
