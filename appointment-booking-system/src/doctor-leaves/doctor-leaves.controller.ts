import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

import { DoctorLeavesService } from './doctor-leaves.service';
import { CreateDoctorLeaveDto } from './dto/create-doctor-leave.dto';

@Controller('doctor-leaves')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
export class DoctorLeavesController {
  constructor(private readonly doctorLeavesService: DoctorLeavesService) {}

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDoctorLeaveDto,
  ) {
    return this.doctorLeavesService.createForDoctorUser(user.sub, dto);
  }
}
