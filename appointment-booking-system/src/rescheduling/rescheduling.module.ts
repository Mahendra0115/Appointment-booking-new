import { Module } from '@nestjs/common';

import { BookingModule } from '../booking/booking.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { SlotsModule } from '../slots/slots.module';
import { UsersModule } from '../users/users.module';

import { ReschedulingController } from './rescheduling.controller';
import { ReschedulingService } from './rescheduling.service';

@Module({
  imports: [BookingModule, SchedulingModule, SlotsModule, UsersModule],
  controllers: [ReschedulingController],
  providers: [ReschedulingService],
})
export class ReschedulingModule {}