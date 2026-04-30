import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DoctorsModule } from '../doctors/doctors.module';
import { UsersModule } from '../users/users.module';

import { Appointment } from './entities/appointment.entity';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment]), DoctorsModule, UsersModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
