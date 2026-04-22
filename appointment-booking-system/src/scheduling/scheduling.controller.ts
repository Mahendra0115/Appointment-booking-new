import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';

import { ApiResponseDto } from '../common/dto/api-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

import { SchedulingService } from './scheduling.service';
import { CreateSchedulingConfigDto } from './dto/create-scheduling-config.dto';
import { UpdateSchedulingConfigDto } from './dto/update-scheduling-config.dto';

@Controller('scheduling')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Post('config')
  async createConfig(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSchedulingConfigDto,
  ) {
    const data = await this.schedulingService.createConfig(user.sub, dto);
    return new ApiResponseDto(
      true,
      'Scheduling configuration created successfully',
      data,
    );
  }

  @Patch('config')
  async updateConfig(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateSchedulingConfigDto,
  ) {
    const data = await this.schedulingService.updateConfig(user.sub, dto);
    return new ApiResponseDto(
      true,
      'Scheduling configuration updated successfully',
      data,
    );
  }
}