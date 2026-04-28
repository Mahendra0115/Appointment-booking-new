import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DoctorProfile } from '../doctor/entities/doctor-profile.entity';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';

@Module({
  imports: [TypeOrmModule.forFeature([DoctorProfile])],
  controllers: [DiscoveryController],
  providers: [DiscoveryService],
})

export class DiscoveryModule {}