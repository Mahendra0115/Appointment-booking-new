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

import { CreateDoctorDto } from './dto/create-doctor.dto';
import { GetDoctorAvailabilityDto } from './dto/get-doctor-availability.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { DoctorsService } from './doctors.service';

@Controller('doctors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post()
  @Roles(Role.DOCTOR)
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDoctorDto,
  ) {
    const data = await this.doctorsService.create(user.sub, dto);
    return new ApiResponseDto(true, 'Doctor created successfully', data);
  }

  @Get()
  @Roles(Role.DOCTOR, Role.PATIENT)
  async findAll() {
    const data = await this.doctorsService.findAll();
    return new ApiResponseDto(true, 'Doctors fetched successfully', data);
  }

  @Get('me')
  @Roles(Role.DOCTOR)
  async getMyProfile(@CurrentUser() user: JwtPayload) {
    const data = await this.doctorsService.getMyDoctorProfile(user.sub);
    return new ApiResponseDto(true, 'Doctor profile fetched successfully', data);
  }

  @Get(':doctorId')
  @Roles(Role.DOCTOR, Role.PATIENT)
  async findOne(@Param('doctorId') doctorId: string) {
    const data = await this.doctorsService.findOne(doctorId);
    return new ApiResponseDto(true, 'Doctor fetched successfully', data);
  }

  @Patch('me')
  @Roles(Role.DOCTOR)
  async update(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateDoctorDto,
  ) {
    const data = await this.doctorsService.updateForDoctorUser(user.sub, dto);
    return new ApiResponseDto(true, 'Doctor updated successfully', data);
  }

  @Get(':doctorId/availability')
  @Roles(Role.DOCTOR, Role.PATIENT)
  async getAvailability(
    @Param('doctorId') doctorId: string,
    @Query() query: GetDoctorAvailabilityDto,
  ) {
    const data = await this.doctorsService.getAvailability(
      doctorId,
      query.date,
      query.daysToSearch,
    );

    return new ApiResponseDto(
      true,
      'Doctor availability fetched successfully',
      data,
    );
  }
}
