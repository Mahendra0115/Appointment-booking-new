export class DoctorProfileResponseDto {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  specialization: string;
  qualification?: string;
  experienceYears: number;
  clinicName?: string;
  consultationFee?: number;
  bio?: string;
  isOnboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  
}