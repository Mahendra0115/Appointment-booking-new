import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('appointment_bookings')
export class AppointmentBooking extends BaseEntity {
  @ManyToOne(() => User, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'doctor_id' })
  doctor: User;

  @ManyToOne(() => User, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_id' })
  patient: User;

  @Column({ name: 'booking_date', type: 'date' })
  bookingDate: string;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column({ length: 30, default: 'BOOKED' })
  status: string;
}