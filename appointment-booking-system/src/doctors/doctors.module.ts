import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Appointment } from '../appointments/entities/appointment.entity';
import { ClinicClosure } from '../clinic-closures/entities/clinic-closure.entity';
import { DoctorLeave } from '../doctor-leaves/entities/doctor-leave.entity';
import { UsersModule } from '../users/users.module';

import { Doctor } from './entities/doctor.entity';
import { DoctorAvailabilityController } from './doctor-availability.controller';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Doctor,
      Appointment,
      DoctorLeave,
      ClinicClosure,
    ]),
    UsersModule,
  ],
  controllers: [DoctorsController, DoctorAvailabilityController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
