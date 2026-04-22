import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { BaseEntity } from '../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('doctor_profiles')
export class DoctorProfile extends BaseEntity {
  @OneToOne(() => User, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 120 })
  specialization: string;

  @Column({ length: 150, nullable: true })
  qualification?: string;

  @Column({ name: 'experience_years', type: 'int', default: 0 })
  experienceYears: number;

  @Column({ name: 'clinic_name', length: 150, nullable: true })
  clinicName?: string;

  @Column({
    name: 'consultation_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  consultationFee?: number;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ name: 'is_onboarding_completed', default: true })
  isOnboardingCompleted: boolean;
  
}