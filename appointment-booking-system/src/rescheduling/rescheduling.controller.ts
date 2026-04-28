import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';

import { ApiResponseDto } from '../common/dto/api-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type  { JwtPayload } from '../common/interfaces/jwt-payload.interface';

import { ReschedulingService } from './rescheduling.service';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

@Controller('rescheduling')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PATIENT)
export class ReschedulingController {
  constructor(private readonly reschedulingService: ReschedulingService) {}

  @Patch('appointments/:appointmentId')
  async rescheduleAppointment(
    @CurrentUser() user: JwtPayload,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    const data = await this.reschedulingService.rescheduleAppointment(
      user.sub,
      appointmentId,
      dto,
    );

    return new ApiResponseDto(
      true,
      'Appointment rescheduled successfully',
      data,
    );
  }
}