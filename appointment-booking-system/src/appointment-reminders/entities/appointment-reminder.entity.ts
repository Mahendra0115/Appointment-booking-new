import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { Appointment } from '../../appointments/entities/appointment.entity';
import { BaseEntity } from '../../database/entities/base.entity';

export enum AppointmentReminderType {
  BOOKING_CONFIRMATION = 'BOOKING_CONFIRMATION',
  REMINDER_24H = 'REMINDER_24H',
  REMINDER_3H = 'REMINDER_3H',
}

export enum AppointmentReminderStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('appointment_reminders')
export class AppointmentReminder extends BaseEntity {
  @ManyToOne(() => Appointment, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @Column({
    name: 'reminder_type',
    type: 'varchar',
    length: 40,
  })
  reminderType: AppointmentReminderType;

  @Column({
    name: 'scheduled_at',
    type: 'timestamp',
  })
  scheduledAt: Date;

  @Column({
    name: 'sent_at',
    type: 'timestamp',
    nullable: true,
  })
  sentAt?: Date | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: AppointmentReminderStatus.PENDING,
  })
  status: AppointmentReminderStatus;

  @Column({
    name: 'failure_reason',
    type: 'text',
    nullable: true,
  })
  failureReason?: string | null;
}
