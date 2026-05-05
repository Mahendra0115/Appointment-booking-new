import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import { Appointment } from '../appointments/entities/appointment.entity';

import { AppointmentReminderType } from './entities/appointment-reminder.entity';

@Injectable()
export class AppointmentEmailService {
  private readonly logger = new Logger(AppointmentEmailService.name);
  private readonly transporter?: nodemailer.Transporter;
  private readonly fromAddress?: string;
  private readonly fromName?: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT', '0'));
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    this.fromAddress = this.configService.get<string>('EMAIL_FROM_ADDRESS');
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME');

    if (!host || !port || !user || !pass || !this.fromAddress) {
      this.logger.warn(
        'SMTP email delivery is disabled because SMTP credentials are missing.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendAppointmentEmail(
    appointment: Appointment,
    reminderType: AppointmentReminderType,
  ) {
    if (!this.transporter || !this.fromAddress) {
      return {
        sent: false,
        reason: 'SMTP is not configured.',
      };
    }

    const subject = this.buildSubject(reminderType);
    const text = this.buildMessage(appointment, reminderType);

    try {
      await this.transporter.sendMail({
        from: this.fromName
          ? `"${this.fromName}" <${this.fromAddress}>`
          : this.fromAddress,
        to: appointment.patientUser.email,
        subject,
        text,
      });

      return {
        sent: true,
      };
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Email sending failed';

      this.logger.error(
        `Failed to send ${reminderType} email for appointment ${appointment.id}: ${reason}`,
      );

      return {
        sent: false,
        reason,
      };
    }
  }

  private buildSubject(reminderType: AppointmentReminderType) {
    if (reminderType === AppointmentReminderType.BOOKING_CONFIRMATION) {
      return 'Appointment booked successfully';
    }

    if (reminderType === AppointmentReminderType.REMINDER_24H) {
      return 'Appointment reminder for tomorrow';
    }

    return 'Appointment reminder';
  }

  private buildMessage(
    appointment: Appointment,
    reminderType: AppointmentReminderType,
  ) {
    const patientName =
      appointment.patientName || appointment.patientUser.fullName || 'Patient';
    const intro =
      reminderType === AppointmentReminderType.BOOKING_CONFIRMATION
        ? `Hello ${patientName}, your appointment has been booked successfully.`
        : `Hello ${patientName}, this is a reminder for your upcoming appointment.`;

    return [
      intro,
      '',
      `Doctor: ${appointment.doctor.doctorName}`,
      `Date: ${appointment.appointmentDate}`,
      `Time: ${appointment.slotStartTime} - ${appointment.slotEndTime}`,
      `Token Number: ${appointment.tokenNumber ?? 'N/A'}`,
      `Status: ${appointment.status}`,
      '',
      'Please contact the clinic if you need to make any changes.',
    ].join('\n');
  }
}
