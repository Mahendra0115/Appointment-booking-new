import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('availability_overrides')
@Index(['doctor', 'overrideDate'])
export class AvailabilityOverride extends BaseEntity {
  @ManyToOne(() => User, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'doctor_id' })
  doctor: User;

  @Column({ name: 'override_date', type: 'date' })
  overrideDate: string;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;
}


// update
