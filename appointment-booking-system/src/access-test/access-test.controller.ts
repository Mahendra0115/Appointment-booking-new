import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import  type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@Controller('access-test')
export class AccessTestController {
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(
    @CurrentUser() user: JwtPayload,
  ): ApiResponseDto<JwtPayload> {
    return new ApiResponseDto(true, 'Authenticated route working', user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DOCTOR)
  @Get('doctor-only')
  doctorOnly(
    @CurrentUser() user: JwtPayload,
  ): ApiResponseDto<JwtPayload> {
    return new ApiResponseDto(true, 'Doctor-only route access granted', user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  @Get('patient-only')
  patientOnly(
    @CurrentUser() user: JwtPayload,
  ): ApiResponseDto<JwtPayload> {
    return new ApiResponseDto(true, 'Patient-only route access granted', user);
  }
}