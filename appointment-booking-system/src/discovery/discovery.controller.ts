import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { ApiResponseDto } from '../common/dto/api-response.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

import { DiscoveryService } from './discovery.service';
import { DoctorDiscoveryQueryDto } from './dto/doctor-discovery-query.dto';

@Controller('discovery')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PATIENT)
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('doctors')
  async getDoctors(
    @Query() query: DoctorDiscoveryQueryDto,
  ): Promise<ApiResponseDto<any[]>> {
    const data = await this.discoveryService.getDoctors(query);
    return new ApiResponseDto(true, 'Doctors fetched successfully', data);
  }

  @Get('doctors/:id')
  async getDoctorById(
    @Param('id') id: string,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.discoveryService.getDoctorById(id);
    return new ApiResponseDto(true, 'Doctor details fetched successfully', data);
  }
  
}