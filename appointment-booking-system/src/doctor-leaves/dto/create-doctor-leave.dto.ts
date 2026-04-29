import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateDoctorLeaveDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsBoolean()
  isFullDay?: boolean;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
