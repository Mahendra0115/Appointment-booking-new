import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ApiResponseDto } from '../common/dto/api-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';


import { PatientService } from './patient.service';
import { CreatePatientProfileDto } from './dto/create-patient-profile.dto';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';
import { PatientProfileResponseDto } from './dto/patient-profile-response.dto';

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PATIENT)
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  // ===== Task 3 routes (preserved) =====
  @Get('me')
  async getMyProfile(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.patientService.getPatientProfile(user.sub);
    return new ApiResponseDto(true, 'Patient profile fetched successfully', data);
  }

  @Get('dashboard')
  getPatientDashboard(
    @CurrentUser() user: JwtPayload,
  ): ApiResponseDto<any> {
    const data = this.patientService.getPatientDashboard(user);
    return new ApiResponseDto(true, 'Patient dashboard fetched successfully', data);
  }

  // ===== Task 4 routes (added) =====
  @Post('profile')
  async createProfile(
    @CurrentUser() user: JwtPayload,
    @Body() createDto: CreatePatientProfileDto,
  ): Promise<ApiResponseDto<PatientProfileResponseDto>> {
    const data = await this.patientService.createProfile(user.sub, createDto);
    return new ApiResponseDto(true, 'Patient profile created successfully', data);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() updateDto: UpdatePatientProfileDto,
  ): Promise<ApiResponseDto<PatientProfileResponseDto>> {
    const data = await this.patientService.updateProfile(user.sub, updateDto);
    return new ApiResponseDto(true, 'Patient profile updated successfully', data);
  }

  @Get('profile')
  async getOnboardingProfile(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<PatientProfileResponseDto>> {
    const data = await this.patientService.getMyOnboardingProfile(user.sub);
    return new ApiResponseDto(true, 'Patient onboarding profile fetched successfully', data);
  }
}