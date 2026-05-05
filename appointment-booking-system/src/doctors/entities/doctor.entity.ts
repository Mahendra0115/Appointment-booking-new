import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

import { BaseEntity } from '../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { DayOfWeek } from '../enums/day-of-week.enum';

@Entity('doctors')
export class Doctor extends BaseEntity {
  @OneToOne(() => User, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'doctor_name', length: 120 })
  doctorName: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  specialization?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string | null;

  @Column({
    name: 'available_days',
    type: 'enum',
    enum: DayOfWeek,
    array: true,
  })
  availableDays: DayOfWeek[];

  @Column({
    name: 'weekly_off_days',
    type: 'enum',
    enum: DayOfWeek,
    array: true,
    default: '{}',
  })
  weeklyOffDays: DayOfWeek[];

  @Column({ name: 'consulting_start_time', type: 'time' })
  consultingStartTime: string;

  @Column({ name: 'consulting_end_time', type: 'time' })
  consultingEndTime: string;

  @Column({ name: 'slot_duration_minutes', type: 'int' })
  slotDurationMinutes: number;

  @Column({ name: 'total_appointments_per_day', type: 'int', nullable: true })
  totalAppointmentsPerDay?: number | null;

  @Column({ name: 'next_available_search_days', type: 'int', default: 7 })
  nextAvailableSearchDays: number;
}
