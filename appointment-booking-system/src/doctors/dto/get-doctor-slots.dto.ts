import { IsDateString, IsOptional } from 'class-validator';

export class GetDoctorSlotsDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}
