import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '../users/users.module';
import { DoctorProfile } from './entities/doctor-profile.entity';
import { DoctorController } from './doctor.controller';
import { DoctorService } from './doctor.service';

@Module({
  imports: [TypeOrmModule.forFeature([DoctorProfile]), UsersModule],
  controllers: [DoctorController],
  providers: [DoctorService],
  exports: [DoctorService],
})

export class DoctorModule {}