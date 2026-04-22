import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '../users/users.module';
import { RecurringAvailability } from './entities/recurring-availability.entity';
import { AvailabilityOverride } from './entities/availability-override.entity';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecurringAvailability, AvailabilityOverride]),
    UsersModule,
  ],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}

// update
