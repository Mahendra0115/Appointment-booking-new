import { IsDateString, IsNotEmpty, Matches } from 'class-validator';

export class RescheduleAppointmentDto {
  @IsDateString()
  newDate: string;

  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'newStartTime must be in HH:mm format',
  })
  newStartTime: string;

  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'newEndTime must be in HH:mm format',
  })
  newEndTime: string;
}