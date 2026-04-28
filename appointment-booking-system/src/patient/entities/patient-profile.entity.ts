import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { BaseEntity } from '../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('patient_profiles')
export class PatientProfile extends BaseEntity {
  @OneToOne(() => User, {
    eager: true,
    onDelete: 'CASCADE',
  })
  
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 20 })
  gender: string;

  @Column({ name: 'date_of_birth', type: 'date' })
  dateOfBirth: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ name: 'emergency_contact_name', length: 100, nullable: true })
  emergencyContactName?: string;

  @Column({ name: 'emergency_contact_phone', length: 20, nullable: true })
  emergencyContactPhone?: string;

  @Column({ name: 'is_onboarding_completed', default: true })
  isOnboardingCompleted: boolean;
}