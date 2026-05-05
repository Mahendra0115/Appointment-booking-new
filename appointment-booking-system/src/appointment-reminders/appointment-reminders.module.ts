import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppointmentReminder } from './entities/appointment-reminder.entity';
import { AppointmentEmailService } from './appointment-email.service';
import { AppointmentRemindersService } from './appointment-reminders.service';

@Module({
  imports: [TypeOrmModule.forFeature([AppointmentReminder])],
  providers: [AppointmentEmailService, AppointmentRemindersService],
  exports: [AppointmentRemindersService],
})
export class AppointmentRemindersModule {}
