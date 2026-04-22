import { IsDateString, IsNotEmpty, IsUUID, Matches } from 'class-validator';

export class CreateAppointmentBookingDto {
  @IsUUID()
  doctorId: string;

  @IsDateString()
  bookingDate: string;

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