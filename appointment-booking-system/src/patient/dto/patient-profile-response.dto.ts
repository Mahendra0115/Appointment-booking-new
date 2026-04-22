export class PatientProfileResponseDto {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  isOnboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  
}