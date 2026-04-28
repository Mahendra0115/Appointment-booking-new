import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

import { DayOfWeek } from '../../availability/enums/day-of-week.enum';

export class CreateDoctorDto {
  @IsString()
  @IsNotEmpty()
  doctorName: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(DayOfWeek, { each: true })
  availableDays: DayOfWeek[];

  @IsOptional()
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  weeklyOffDays?: DayOfWeek[];

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'consultingStartTime must be in HH:mm format',
  })
  consultingStartTime: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'consultingEndTime must be in HH:mm format',
  })
  consultingEndTime: string;

  @IsInt()
  @Min(5)
  @Max(240)
  slotDurationMinutes: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalAppointmentsPerDay?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  nextAvailableSearchDays?: number;
}
