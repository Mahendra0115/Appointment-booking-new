import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

import { ClinicClosuresService } from './clinic-closures.service';
import { CreateClinicClosureDto } from './dto/create-clinic-closure.dto';

@Controller('clinic-closures')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
export class ClinicClosuresController {
  constructor(private readonly clinicClosuresService: ClinicClosuresService) {}

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateClinicClosureDto,
  ) {
    return this.clinicClosuresService.createForDoctorUser(user.sub, dto);
  }
}
