import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DayOfWeek } from '../availability/enums/day-of-week.enum';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';

import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { Doctor } from './entities/doctor.entity';

type Slot = {
  startTime: string;
  endTime: string;
};

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly usersService: UsersService,
  ) {}

  async create(userId: string, dto: CreateDoctorDto) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('Doctor user not found');
    }

    if (user.role !== Role.DOCTOR) {
      throw new BadRequestException('Only doctor users can create doctor profiles');
    }

    const existingDoctor = await this.doctorRepository.findOne({
      where: { user: { id: userId } },
    });

    if (existingDoctor) {
      throw new ConflictException('Doctor profile already exists for this account');
    }

    this.validateDoctorConfig(dto);

    const doctor = this.doctorRepository.create({
      user,
      doctorName: dto.doctorName,
      specialization: dto.specialization ?? null,
      availableDays: this.uniqueDays(dto.availableDays),
      weeklyOffDays: this.uniqueDays(dto.weeklyOffDays ?? [DayOfWeek.SUNDAY]),
      consultingStartTime: dto.consultingStartTime,
      consultingEndTime: dto.consultingEndTime,
      slotDurationMinutes: dto.slotDurationMinutes,
      totalAppointmentsPerDay: dto.totalAppointmentsPerDay ?? null,
      nextAvailableSearchDays: dto.nextAvailableSearchDays ?? 7,
    });

    const savedDoctor = await this.doctorRepository.save(doctor);

    return this.toDoctorResponse(savedDoctor);
  }

  async findAll() {
    const doctors = await this.doctorRepository.find({
      order: { doctorName: 'ASC' },
    });

    return doctors.map((doctor) => this.toDoctorResponse(doctor));
  }

  async findOne(doctorId: string) {
    const doctor = await this.findDoctorEntityOrFail(doctorId);
    return this.toDoctorResponse(doctor);
  }

  async update(doctorId: string, dto: UpdateDoctorDto) {
    const doctor = await this.findDoctorEntityOrFail(doctorId);

    const nextDoctor = this.doctorRepository.merge(doctor, {
      ...dto,
      specialization:
        dto.specialization === undefined ? doctor.specialization : dto.specialization,
      availableDays: dto.availableDays
        ? this.uniqueDays(dto.availableDays)
        : doctor.availableDays,
      weeklyOffDays: dto.weeklyOffDays
        ? this.uniqueDays(dto.weeklyOffDays)
        : doctor.weeklyOffDays,
      totalAppointmentsPerDay:
        dto.totalAppointmentsPerDay === undefined
          ? doctor.totalAppointmentsPerDay
          : dto.totalAppointmentsPerDay,
      nextAvailableSearchDays:
        dto.nextAvailableSearchDays ?? doctor.nextAvailableSearchDays,
    });

    this.validateDoctorConfig(nextDoctor);

    const savedDoctor = await this.doctorRepository.save(nextDoctor);
    return this.toDoctorResponse(savedDoctor);
  }

  async updateForDoctorUser(userId: string, dto: UpdateDoctorDto) {
    const doctor = await this.findDoctorByUserIdOrFail(userId);
    return this.update(doctor.id, dto);
  }

  async getMyDoctorProfile(userId: string) {
    const doctor = await this.findDoctorByUserIdOrFail(userId);
    return this.toDoctorResponse(doctor);
  }

  async getAvailability(
    doctorId: string,
    requestedDate?: string,
    daysToSearch?: number,
  ) {
    const doctor = await this.findDoctorEntityOrFail(doctorId);
    const startDate = requestedDate ?? this.getTodayDateString();
    const searchWindow = daysToSearch ?? doctor.nextAvailableSearchDays;

    const todaySchedule = await this.buildDailySchedule(doctor, startDate);
    const isToday = startDate === this.getTodayDateString();

    if (todaySchedule.availableSlots > 0) {
      return {
        doctor: this.toDoctorResponse(doctor),
        requestedDate: startDate,
        nextAvailableDate: startDate,
        nextAvailableSlot: todaySchedule.slots[0] ?? null,
        searchedDays: 1,
        message: isToday
          ? `Appointments are available today on ${startDate}.`
          : `Appointments are available on ${startDate}.`,
        schedule: todaySchedule,
      };
    }

    const nextAvailable = await this.findNextAvailableDay(
      doctor,
      startDate,
      searchWindow,
    );

    if (!nextAvailable) {
      return {
        doctor: this.toDoctorResponse(doctor),
        requestedDate: startDate,
        nextAvailableDate: null,
        nextAvailableSlot: null,
        searchedDays: searchWindow,
        message: `No appointments available in the next ${searchWindow} days. Please contact clinic.`,
        schedule: todaySchedule,
      };
    }

    return {
      doctor: this.toDoctorResponse(doctor),
      requestedDate: startDate,
      nextAvailableDate: nextAvailable.date,
      nextAvailableSlot: nextAvailable.slot,
      searchedDays: nextAvailable.offset + 1,
      message: isToday
        ? `No appointments available today. Next available appointment is on ${nextAvailable.date} at ${nextAvailable.slot.startTime}.`
        : `No appointments available on ${startDate}. Next available appointment is on ${nextAvailable.date} at ${nextAvailable.slot.startTime}.`,
      schedule: nextAvailable.schedule,
    };
  }

  async buildDailySchedule(doctor: Doctor, date: string) {
    const isWorkingDay = this.isDoctorWorkingOnDate(doctor, date);
    const generatedSlots = isWorkingDay ? this.generateSlots(doctor) : [];

    if (generatedSlots.length === 0) {
      return {
        date,
        isWorkingDay,
        totalSlots: 0,
        bookedSlots: 0,
        availableSlots: 0,
        slots: [],
      };
    }

    const appointments = await this.appointmentRepository.find({
      where: {
        doctor: { id: doctor.id },
        appointmentDate: date,
        status: 'BOOKED',
      },
      order: { slotStartTime: 'ASC' },
    });

    const availableSlotRows = generatedSlots
      .map((slot) => {
        const isBooked = appointments.some(
          (appointment) =>
            this.normalizeTime(appointment.slotStartTime) ===
            this.normalizeTime(slot.startTime),
        );

        return {
          ...slot,
          isBooked,
        };
      })
      .filter((slot) => !slot.isBooked && this.isSlotBookable(date, slot.startTime))
      .map(({ isBooked: _isBooked, ...slot }) => slot);

    return {
      date,
      isWorkingDay,
      totalSlots: generatedSlots.length,
      bookedSlots: appointments.length,
      availableSlots: availableSlotRows.length,
      slots: availableSlotRows,
    };
  }

  async validateSlotForBooking(
    doctorId: string,
    appointmentDate: string,
    slotStartTime: string,
  ) {
    const doctor = await this.findDoctorEntityOrFail(doctorId);
    const schedule = await this.buildDailySchedule(doctor, appointmentDate);
    const normalizedRequestedStartTime = this.normalizeTime(slotStartTime);
    const selectedSlot = schedule.slots.find(
      (slot) => this.normalizeTime(slot.startTime) === normalizedRequestedStartTime,
    );

    if (!selectedSlot) {
      const nextAvailable = await this.findNextAvailableDay(
        doctor,
        appointmentDate,
        doctor.nextAvailableSearchDays,
        slotStartTime,
      );

      throw new BadRequestException({
        message: 'This slot is already booked.',
        nextavailableDays: nextAvailable?.day ?? null,
        nextAvailableDate: nextAvailable?.date ?? null,
        nextAvailableSlot: nextAvailable?.slot ?? null,
      });
    }

    return { doctor, selectedSlot, schedule };
  }

  async findNextAvailableSlotForBooking(
    doctorId: string,
    appointmentDate: string,
    slotStartTime?: string,
  ) {
    const doctor = await this.findDoctorEntityOrFail(doctorId);
    const nextAvailable = await this.findNextAvailableDay(
      doctor,
      appointmentDate,
      doctor.nextAvailableSearchDays,
      slotStartTime,
    );

    if (!nextAvailable) {
      return null;
    }

    return {
      doctor,
      appointmentDate: nextAvailable.date,
      selectedSlot: nextAvailable.slot,
      nextavailableDays: nextAvailable.day,
      schedule: nextAvailable.schedule,
    };
  }

  private async findNextAvailableDay(
    doctor: Doctor,
    startDate: string,
    daysToSearch: number,
    afterStartTime?: string,
  ) {
    for (let offset = 0; offset <= daysToSearch; offset += 1) {
      const nextDate = this.addDays(startDate, offset);
      const schedule = await this.buildDailySchedule(doctor, nextDate);
      const slots =
        offset === 0 && afterStartTime
          ? schedule.slots.filter(
              (slot) =>
                this.timeToMinutes(this.normalizeTime(slot.startTime)) >
                this.timeToMinutes(this.normalizeTime(afterStartTime)),
            )
          : schedule.slots;

      if (slots.length > 0) {
        const [firstAvailableSlot] = slots;

        return {
          date: nextDate,
          offset,
          day: this.getDisplayDayOfWeek(nextDate),
          slot: firstAvailableSlot,
          schedule: {
            ...schedule,
            availableSlots: firstAvailableSlot ? 1 : 0,
            slots: firstAvailableSlot ? [firstAvailableSlot] : [],
          },
        };
      }
    }

    return null;
  }

  private generateSlots(doctor: Doctor): Slot[] {
    const startMinutes = this.timeToMinutes(doctor.consultingStartTime);
    const endMinutes = this.timeToMinutes(doctor.consultingEndTime);

    if (endMinutes <= startMinutes) {
      throw new BadRequestException(
        'consultingEndTime must be later than consultingStartTime',
      );
    }

    const computedSlots = Math.floor(
      (endMinutes - startMinutes) / doctor.slotDurationMinutes,
    );

    if (computedSlots <= 0) {
      throw new BadRequestException(
        'Doctor configuration does not create any valid appointment slots',
      );
    }

    const effectiveSlots = doctor.totalAppointmentsPerDay
      ? Math.min(doctor.totalAppointmentsPerDay, computedSlots)
      : computedSlots;

    const slots: Slot[] = [];

    for (let index = 0; index < effectiveSlots; index += 1) {
      const slotStartMinutes =
        startMinutes + index * doctor.slotDurationMinutes;
      const slotEndMinutes = slotStartMinutes + doctor.slotDurationMinutes;

      slots.push({
        startTime: this.minutesToTime(slotStartMinutes),
        endTime: this.minutesToTime(slotEndMinutes),
      });
    }

    return slots;
  }

  private validateDoctorConfig(dto: {
    consultingStartTime?: string;
    consultingEndTime?: string;
    availableDays?: DayOfWeek[];
    weeklyOffDays?: DayOfWeek[];
  }) {
    if (
      dto.consultingStartTime &&
      dto.consultingEndTime &&
      dto.consultingStartTime >= dto.consultingEndTime
    ) {
      throw new BadRequestException(
        'consultingEndTime must be later than consultingStartTime',
      );
    }

    if (
      dto.availableDays &&
      dto.weeklyOffDays &&
      dto.availableDays.some((day) => dto.weeklyOffDays?.includes(day))
    ) {
      throw new BadRequestException(
        'availableDays and weeklyOffDays cannot contain the same day',
      );
    }
  }

  private toDoctorResponse(doctor: Doctor) {
    const computedTotalSlots = Math.floor(
      (this.timeToMinutes(doctor.consultingEndTime) -
        this.timeToMinutes(doctor.consultingStartTime)) /
        doctor.slotDurationMinutes,
    );

    const totalSlotsPerDay = doctor.totalAppointmentsPerDay
      ? Math.min(doctor.totalAppointmentsPerDay, computedTotalSlots)
      : computedTotalSlots;

    return {
      id: doctor.id,
      userId: doctor.user.id,
      doctorName: doctor.doctorName,
      specialization: doctor.specialization,
      availableDays: doctor.availableDays,
      weeklyOffDays: doctor.weeklyOffDays,
      consultingStartTime: doctor.consultingStartTime,
      consultingEndTime: doctor.consultingEndTime,
      slotDurationMinutes: doctor.slotDurationMinutes,
      totalAppointmentsPerDay: doctor.totalAppointmentsPerDay,
      autoCalculatedTotalSlots: computedTotalSlots,
      totalSlotsPerDay,
      nextAvailableSearchDays: doctor.nextAvailableSearchDays,
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
    };
  }

  private async findDoctorEntityOrFail(doctorId: string) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: doctorId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return doctor;
  }

  private async findDoctorByUserIdOrFail(userId: string) {
    const doctor = await this.doctorRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found for this user');
    }

    return doctor;
  }

  private isDoctorWorkingOnDate(doctor: Doctor, date: string) {
    const dayOfWeek = this.getDayOfWeekFromDate(date);

    return (
      doctor.availableDays.includes(dayOfWeek) &&
      !doctor.weeklyOffDays.includes(dayOfWeek)
    );
  }

  private isSlotBookable(date: string, startTime: string) {
    const now = new Date();
    const slotDateTime = new Date(`${date}T${startTime}:00`);

    return slotDateTime > now;
  }

  private getDayOfWeekFromDate(date: string): DayOfWeek {
    const dayIndex = new Date(`${date}T00:00:00`).getDay();

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

  private getDisplayDayOfWeek(date: string) {
    const day = this.getDayOfWeekFromDate(date).toLowerCase();
    return day.charAt(0).toUpperCase() + day.slice(1);
  }

  private addDays(date: string, days: number) {
    const next = new Date(`${date}T00:00:00`);
    next.setDate(next.getDate() + days);
    return this.formatDate(next);
  }

  private getTodayDateString() {
    return this.formatDate(new Date());
  }

  private formatDate(date: Date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private uniqueDays(days: DayOfWeek[]) {
    return [...new Set(days)];
  }

  private timeToMinutes(time: string) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(totalMinutes: number) {
    const hours = `${Math.floor(totalMinutes / 60)}`.padStart(2, '0');
    const minutes = `${totalMinutes % 60}`.padStart(2, '0');

    return `${hours}:${minutes}`;
  }

  private normalizeTime(time: string) {
    return time.slice(0, 5);
  }
}
