import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

import { ClinicClosuresService } from './clinic-closures.service';
import { CreateClinicClosureDto } from './dto/create-clinic-closure.dto';

@Controller('clinic-closures')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
export class ClinicClosuresController {
  constructor(private readonly clinicClosuresService: ClinicClosuresService) {}

  @Post()
  async create(@Body() dto: CreateClinicClosureDto) {
    return this.clinicClosuresService.create(dto);
  }
}
