import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Doctor } from '../doctors/entities/doctor.entity';

import { ClinicClosuresController } from './clinic-closures.controller';
import { ClinicClosuresService } from './clinic-closures.service';
import { ClinicClosure } from './entities/clinic-closure.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ClinicClosure, Doctor])],
  controllers: [ClinicClosuresController],
  providers: [ClinicClosuresService],
})
export class ClinicClosuresModule {}
