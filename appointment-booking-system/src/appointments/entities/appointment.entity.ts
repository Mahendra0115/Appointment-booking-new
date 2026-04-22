import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../database/entities/base.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { User } from '../../users/entities/user.entity';

@Entity('appointments')
export class Appointment extends BaseEntity {
  @ManyToOne(() => Doctor, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @ManyToOne(() => User, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_user_id' })
  patientUser: User;

  @Column({ name: 'patient_phone_number', length: 20 })
  patientPhoneNumber: string;

  @Column({
    name: 'patient_name',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  patientName?: string | null;

  @Column({ name: 'reason_for_visit', type: 'text', nullable: true })
  reasonForVisit?: string | null;

  @Column({ name: 'appointment_date', type: 'date' })
  appointmentDate: string;

  @Column({ name: 'slot_start_time', type: 'time' })
  slotStartTime: string;

  @Column({ name: 'slot_end_time', type: 'time' })
  slotEndTime: string;

  @Column({ length: 30, default: 'BOOKED' })
  status: string;
}
