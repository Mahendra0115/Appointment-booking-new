import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { ApiResponseDto } from '../common/dto/api-response.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

import { GetDoctorSlotsDto } from './dto/get-doctor-slots.dto';
import { GetNextAvailableDto } from './dto/get-next-available.dto';
import { DoctorsService } from './doctors.service';

@Controller('doctor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR, Role.PATIENT)
export class DoctorAvailabilityController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get(':doctorId/next-available')
  async getNextAvailable(
    @Param('doctorId') doctorId: string,
    @Query() query: GetNextAvailableDto,
  ) {
    const data = await this.doctorsService.getNextAvailable(
      doctorId,
      query.from,
      query.daysToSearch,
    );

    return new ApiResponseDto(
      true,
      'Next available appointment fetched successfully',
      data,
    );
  }

  @Get(':doctorId/slots')
  async getSlots(
    @Param('doctorId') doctorId: string,
    @Query() query: GetDoctorSlotsDto,
  ) {
    const data = await this.doctorsService.getSlots(doctorId, query.date);

    return new ApiResponseDto(true, 'Doctor slots fetched successfully', data);
  }
}
