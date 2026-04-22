import { Inject, forwardRef, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UsersService } from '../users/users.service';
import { AvailabilityOverride } from '../availability/entities/availability-override.entity';
import { RecurringAvailability } from '../availability/entities/recurring-availability.entity';
import { BookingService } from '../booking/booking.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { SchedulingType } from '../scheduling/enums/scheduling-type.enum';
import { ResolvedAvailabilityWindow } from './interfaces/resolved-availability-window.interface';
import { DayOfWeek } from '../availability/enums/day-of-week.enum';

@Injectable()
export class SlotsService {
  constructor(
    @InjectRepository(RecurringAvailability)
    private readonly recurringAvailabilityRepository: Repository<RecurringAvailability>,

    @InjectRepository(AvailabilityOverride)
    private readonly availabilityOverrideRepository: Repository<AvailabilityOverride>,

    private readonly usersService: UsersService,
    @Inject(forwardRef(() => BookingService))
    private readonly bookingService: BookingService,
    private readonly schedulingService: SchedulingService,
  ) {}

  async getAvailableSlotsForDoctor(doctorId: string, date: string) {
    const doctor = await this.usersService.findById(doctorId);

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const windows = await this.resolveAvailabilityForDate(doctorId, date);

    const schedulingConfig =
      await this.schedulingService.findConfigByDoctorId(doctorId);

    const schedulingType =
      schedulingConfig?.schedulingType ?? SchedulingType.STREAM;
    const slotDuration = schedulingConfig?.slotDuration ?? 15;
    const bufferTime = schedulingConfig?.bufferTime ?? 0;
    const waveCapacity = schedulingConfig?.waveCapacity ?? 1;

    if (schedulingType === SchedulingType.WAVE) {
      const waves = await this.generateWaveWindows(
        doctorId,
        date,
        windows,
        waveCapacity,
      );

      return {
        doctorId,
        date,
        schedulingType: SchedulingType.WAVE,
        waves,
      };
    }

    const generatedSlots = this.generateStreamSlotsFromWindows(
      windows,
      slotDuration,
      bufferTime,
    );

    const futureSlots = this.filterFutureItems(date, generatedSlots);

    const bookedSlots = await this.bookingService.findBookedSlotsForDoctor(
      doctorId,
      date,
    );

    const availableSlots = futureSlots.filter((slot) => {
      return !bookedSlots.some(
        (booking) =>
          booking.startTime === slot.startTime &&
          booking.endTime === slot.endTime,
      );
    });

    return {
      doctorId,
      date,
      schedulingType: SchedulingType.STREAM,
      slotDuration,
      bufferTime,
      slots: availableSlots,
    };
  }

  async getResolvedAvailabilityForDateForInternalUse(
    doctorId: string,
    date: string,
  ): Promise<ResolvedAvailabilityWindow[]> {
    return this.resolveAvailabilityForDate(doctorId, date);
  }

  generateStreamSlotsFromWindowsForInternalUse(
    windows: ResolvedAvailabilityWindow[],
    slotDuration: number,
    bufferTime: number,
  ) {
    return this.generateStreamSlotsFromWindows(
      windows,
      slotDuration,
      bufferTime,
    );
  }

  private async resolveAvailabilityForDate(
    doctorId: string,
    date: string,
  ): Promise<ResolvedAvailabilityWindow[]> {
    const overrides = await this.availabilityOverrideRepository.find({
      where: {
        doctor: { id: doctorId },
        overrideDate: date,
      },
      order: { startTime: 'ASC' },
    });

    if (overrides.length > 0) {
      return overrides.map((override) => ({
        startTime: override.startTime,
        endTime: override.endTime,
      }));
    }

    const dayOfWeek = this.getDayOfWeekFromDate(date);

    const recurringAvailabilities =
      await this.recurringAvailabilityRepository.find({
        where: {
          doctor: { id: doctorId },
          dayOfWeek,
        },
        order: { startTime: 'ASC' },
      });

    return recurringAvailabilities.map((availability) => ({
      startTime: availability.startTime,
      endTime: availability.endTime,
    }));
  }

  private generateStreamSlotsFromWindows(
    windows: ResolvedAvailabilityWindow[],
    slotDuration: number,
    bufferTime: number,
  ) {
    const slots: Array<{ startTime: string; endTime: string }> = [];

    for (const window of windows) {
      let currentStartMinutes = this.timeToMinutes(window.startTime);
      const windowEndMinutes = this.timeToMinutes(window.endTime);

      while (currentStartMinutes + slotDuration <= windowEndMinutes) {
        const slotStart = this.minutesToTime(currentStartMinutes);
        const slotEnd = this.minutesToTime(
          currentStartMinutes + slotDuration,
        );

        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
        });

        currentStartMinutes += slotDuration + bufferTime;
      }
    }

    return slots;
  }

  private async generateWaveWindows(
    doctorId: string,
    date: string,
    windows: ResolvedAvailabilityWindow[],
    waveCapacity: number,
  ) {
    const futureWindows = this.filterFutureItems(date, windows);

    const results: Array<{
      startTime: string;
      endTime: string;
      maxPatients: number;
      bookedPatients: number;
      remainingCapacity: number;
    }> = [];

    for (const window of futureWindows) {
      const bookedPatients =
        await this.bookingService.countBookedWithinWindow(
          doctorId,
          date,
          window.startTime,
          window.endTime,
        );

      const remainingCapacity = waveCapacity - bookedPatients;

      if (remainingCapacity > 0) {
        results.push({
          startTime: window.startTime,
          endTime: window.endTime,
          maxPatients: waveCapacity,
          bookedPatients,
          remainingCapacity,
        });
      }
    }

    return results;
  }

  private filterFutureItems(
    date: string,
    items: Array<{ startTime: string; endTime: string }>,
  ) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (date > today) {
      return items;
    }

    if (date < today) {
      return [];
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return items.filter(
      (item) => this.timeToMinutes(item.startTime) > currentMinutes,
    );
  }

  private getDayOfWeekFromDate(date: string): DayOfWeek {
  const dayIndex = new Date(date).getDay();

  const days: DayOfWeek[] = [
    DayOfWeek.SUNDAY,
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
  ];

  return days[dayIndex];
}

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60)
      .toString()
      .padStart(2, '0');
    const minutes = (totalMinutes % 60).toString().padStart(2, '0');

    return `${hours}:${minutes}`;
  }
}
