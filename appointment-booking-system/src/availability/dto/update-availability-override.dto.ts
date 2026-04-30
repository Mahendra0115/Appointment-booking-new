import { IsDateString, IsOptional, Matches } from 'class-validator';

export class UpdateAvailabilityOverrideDto {
  @IsOptional()
  @IsDateString()
  overrideDate?: string;

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
}


// update
