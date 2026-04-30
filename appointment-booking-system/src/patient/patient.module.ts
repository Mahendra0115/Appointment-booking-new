import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '../users/users.module';
import { PatientProfile } from './entities/patient-profile.entity';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';

@Module({
  imports: [TypeOrmModule.forFeature([PatientProfile]), UsersModule],
  controllers: [PatientController],
  providers: [PatientService],
  exports: [PatientService],
})

export class PatientModule {}