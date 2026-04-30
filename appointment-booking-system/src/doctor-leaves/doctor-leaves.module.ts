import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Doctor } from '../doctors/entities/doctor.entity';

import { DoctorLeavesController } from './doctor-leaves.controller';
import { DoctorLeavesService } from './doctor-leaves.service';
import { DoctorLeave } from './entities/doctor-leave.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DoctorLeave, Doctor])],
  controllers: [DoctorLeavesController],
  providers: [DoctorLeavesService],
})
export class DoctorLeavesModule {}
