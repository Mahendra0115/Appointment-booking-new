import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppointmentBooking } from './entities/appointment-booking.entity';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { UsersModule } from '../users/users.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { SlotsModule } from '../slots/slots.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AppointmentBooking]),
    UsersModule,
    SchedulingModule,
    forwardRef(() => SlotsModule),
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
