import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { DayOfWeek } from '../enums/day-of-week.enum';

export class UpdateDoctorDto {
  @IsOptional()
  @IsString()
  doctorName?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  address?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  availableDays?: DayOfWeek[];

  @IsOptional()
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  weeklyOffDays?: DayOfWeek[];

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'consultingStartTime must be in HH:mm format',
  })
  consultingStartTime?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'consultingEndTime must be in HH:mm format',
  })
  consultingEndTime?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(240)
  slotDurationMinutes?: number;

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
