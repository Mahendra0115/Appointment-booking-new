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

import { DoctorService } from './doctor.service';
import { CreateDoctorProfileDto } from './dto/create-doctor-profile.dto';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';
import { DoctorProfileResponseDto } from './dto/doctor-profile-response.dto';

@Controller('doctors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  // ===== Task 3 routes (preserved) =====
  @Get('me')
  async getMyProfile(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.doctorService.getDoctorProfile(user.sub);
    return new ApiResponseDto(true, 'Doctor profile fetched successfully', data);
  }

  @Get('dashboard')
  getDoctorDashboard(
    @CurrentUser() user: JwtPayload,
  ): ApiResponseDto<any> {
    const data = this.doctorService.getDoctorDashboard(user);
    return new ApiResponseDto(true, 'Doctor dashboard fetched successfully', data);
  }

  // ===== Task 4 routes (added) =====
  @Post('profile')
  async createProfile(
    @CurrentUser() user: JwtPayload,
    @Body() createDto: CreateDoctorProfileDto,
  ): Promise<ApiResponseDto<DoctorProfileResponseDto>> {
    const data = await this.doctorService.createProfile(user.sub, createDto);
    return new ApiResponseDto(true, 'Doctor profile created successfully', data);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() updateDto: UpdateDoctorProfileDto,
  ): Promise<ApiResponseDto<DoctorProfileResponseDto>> {
    const data = await this.doctorService.updateProfile(user.sub, updateDto);
    return new ApiResponseDto(true, 'Doctor profile updated successfully', data);
  }

  @Get('profile')
  async getOnboardingProfile(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponseDto<DoctorProfileResponseDto>> {
    const data = await this.doctorService.getMyOnboardingProfile(user.sub);
    return new ApiResponseDto(true, 'Doctor onboarding profile fetched successfully', data);
  }
  
}