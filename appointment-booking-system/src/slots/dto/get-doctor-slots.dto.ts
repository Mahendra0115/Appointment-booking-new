
import { IsDateString } from 'class-validator';

export class GetDoctorSlotsDto {
  @IsDateString()
  date: string;
}

