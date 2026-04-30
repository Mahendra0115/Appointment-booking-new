import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { ApiResponseDto } from '../common/dto/api-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

import { AvailabilityService } from './availability.service';
import { CreateRecurringAvailabilityDto } from './dto/create-recurring-availability.dto';
import { UpdateRecurringAvailabilityDto } from './dto/update-recurring-availability.dto';
import { CreateAvailabilityOverrideDto } from './dto/create-availability-override.dto';
import { UpdateAvailabilityOverrideDto } from './dto/update-availability-override.dto';

@Controller('availability')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post('recurring')
  async createRecurringAvailability(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRecurringAvailabilityDto,
  ) {
    const data = await this.availabilityService.createRecurringAvailability(
      user.sub,
      dto,
    );

    return new ApiResponseDto(
      true,
      'Recurring availability created successfully',
      data,
    );
  }

  @Patch('recurring/:id')
  async updateRecurringAvailability(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringAvailabilityDto,
  ) {
    const data = await this.availabilityService.updateRecurringAvailability(
      user.sub,
      id,
      dto,
    );

    return new ApiResponseDto(
      true,
      'Recurring availability updated successfully',
      data,
    );
  }

  @Post('override')
  async createAvailabilityOverride(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAvailabilityOverrideDto,
  ) {
    const data = await this.availabilityService.createAvailabilityOverride(
      user.sub,
      dto,
    );

    return new ApiResponseDto(
      true,
      'Availability override created successfully',
      data,
    );
  }

  @Patch('override/:id')
  async updateAvailabilityOverride(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityOverrideDto,
  ) {
    const data = await this.availabilityService.updateAvailabilityOverride(
      user.sub,
      id,
      dto,
    );

    return new ApiResponseDto(
      true,
      'Availability override updated successfully',
      data,
    );
  }
}


// update
