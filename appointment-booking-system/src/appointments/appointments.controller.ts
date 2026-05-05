import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ApiResponseDto } from '../common/dto/api-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentsService } from './appointments.service';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PATIENT)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAppointmentDto,
  ) {
    const data = await this.appointmentsService.create(user.sub, dto);
    return new ApiResponseDto(true, 'Appointment booked successfully', data);
  }

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('doctorId') doctorId?: string,
    @Query('appointmentDate') appointmentDate?: string,
  ) {
    const data = await this.appointmentsService.findAll(
      user.sub,
      doctorId,
      appointmentDate,
    );
    return new ApiResponseDto(true, 'Appointments fetched successfully', data);
  }

  @Get(':appointmentId')
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('appointmentId') appointmentId: string,
  ) {
    const data = await this.appointmentsService.findOne(appointmentId, user.sub);
    return new ApiResponseDto(true, 'Appointment fetched successfully', data);
  }

  @Patch(':appointmentId/cancel')
  async cancel(
    @CurrentUser() user: JwtPayload,
    @Param('appointmentId') appointmentId: string,
  ) {
    const data = await this.appointmentsService.cancel(appointmentId, user.sub);
    return new ApiResponseDto(true, 'Appointment cancelled successfully', data);
  }

  @Patch(':appointmentId/confirm')
  async confirm(
    @CurrentUser() user: JwtPayload,
    @Param('appointmentId') appointmentId: string,
  ) {
    const data = await this.appointmentsService.confirm(appointmentId, user.sub);
    return new ApiResponseDto(true, 'Appointment confirmed successfully', data);
  }
}
