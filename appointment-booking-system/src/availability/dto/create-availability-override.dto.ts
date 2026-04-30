import { IsDateString, IsNotEmpty, Matches } from 'class-validator';

// update

export class CreateAvailabilityOverrideDto {
  @IsDateString()
  overrideDate: string;

  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime: string;

  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime: string;
}

