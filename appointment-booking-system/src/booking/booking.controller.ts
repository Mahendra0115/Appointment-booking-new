import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { ApiResponseDto } from '../common/dto/api-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

import { BookingService } from './booking.service';
import { CreateAppointmentBookingDto } from './dto/create-appointment-booking.dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PATIENT)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  async createAppointment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAppointmentBookingDto,
  ) {
    const data = await this.bookingService.createAppointment(user.sub, dto);

    return new ApiResponseDto(true, 'Appointment booked successfully', data);
  }
}
