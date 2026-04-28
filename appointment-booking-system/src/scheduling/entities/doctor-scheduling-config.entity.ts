import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { SchedulingType } from '../enums/scheduling-type.enum';

@Entity('doctor_scheduling_configs')
export class DoctorSchedulingConfig extends BaseEntity {
  @OneToOne(() => User, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'doctor_id' })
  doctor: User;

  @Column({
    name: 'scheduling_type',
    type: 'enum',
    enum: SchedulingType,
  })
  schedulingType: SchedulingType;

  @Column({ name: 'slot_duration', type: 'int', nullable: true })
  slotDuration?: number | null;

  @Column({ name: 'buffer_time', type: 'int', default: 0 })
  bufferTime: number;

  @Column({ name: 'wave_capacity', type: 'int', nullable: true })
  waveCapacity?: number | null;
}