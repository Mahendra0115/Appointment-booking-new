import { Column, Entity } from 'typeorm';

import { BaseEntity } from '../../database/entities/base.entity';

@Entity('clinic_closures')
export class ClinicClosure extends BaseEntity {
  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ name: 'is_full_day', type: 'boolean', default: true })
  isFullDay: boolean;

  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime?: string | null;

  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime?: string | null;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;
}
