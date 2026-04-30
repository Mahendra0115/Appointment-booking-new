import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { DayOfWeek } from '../enums/day-of-week.enum';

@Entity('recurring_availabilities')
@Index(['doctor', 'dayOfWeek'])
export class RecurringAvailability extends BaseEntity {
  @ManyToOne(() => User, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'doctor_id' })
  doctor: User;

  @Column({
    name: 'day_of_week',
    type: 'enum',
    enum: DayOfWeek,
  })
  dayOfWeek: DayOfWeek;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;
}

// update
