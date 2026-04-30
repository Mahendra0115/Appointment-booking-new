import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { ApiResponseDto } from '../common/dto/api-response.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

import { GetDoctorSlotsDto } from './dto/get-doctor-slots.dto';
import { SlotsService } from './slots.service';

@Controller('slots')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PATIENT)
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Get('doctors/:doctorId')
  async getDoctorSlots(
    @Param('doctorId') doctorId: string,
    @Query() query: GetDoctorSlotsDto,
  ) {
    const data = await this.slotsService.getAvailableSlotsForDoctor(
      doctorId,
      query.date,
    );

    return new ApiResponseDto(true, 'Available schedule fetched successfully', data);
  }
}