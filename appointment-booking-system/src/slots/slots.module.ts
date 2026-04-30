
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '../users/users.module';
import { BookingModule } from '../booking/booking.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { RecurringAvailability } from '../availability/entities/recurring-availability.entity';
import { AvailabilityOverride } from '../availability/entities/availability-override.entity';

import { SlotsController } from './slots.controller';
import { SlotsService } from './slots.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecurringAvailability, AvailabilityOverride]),
    UsersModule,
    forwardRef(() => BookingModule),
    SchedulingModule,
  ],
  controllers: [SlotsController],
  providers: [SlotsService],
  exports: [SlotsService],
})
export class SlotsModule {}
