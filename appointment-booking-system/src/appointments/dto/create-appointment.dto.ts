import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  doctorId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'patientPhoneNumber must contain 10 to 15 digits',
  })
  patientPhoneNumber: string;

  @IsOptional()
  @IsString()
  patientName?: string;

  @IsOptional()
  @IsString()
  reasonForVisit?: string;

  @IsOptional()
  @IsDateString()
  appointmentDate?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'slotStartTime must be in HH:mm format',
  })
  slotStartTime: string;
}
