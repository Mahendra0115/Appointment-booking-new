import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Appointment } from '../appointments/entities/appointment.entity';
import { UsersModule } from '../users/users.module';

import { Doctor } from './entities/doctor.entity';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor, Appointment]), UsersModule],
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
