import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';

import { Appointment } from '../appointments/entities/appointment.entity';
import { ClinicClosure } from '../clinic-closures/entities/clinic-closure.entity';
import { Role } from '../common/enums/role.enum';
import { DoctorLeave } from '../doctor-leaves/entities/doctor-leave.entity';
import { UsersService } from '../users/users.service';

import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { Doctor } from './entities/doctor.entity';
import { DayOfWeek } from './enums/day-of-week.enum';

type Slot = {
  startTime: string;
  endTime: string;
};

type AvailabilityBlock = {
  isFullDay: boolean;
  startTime?: string | null;
  endTime?: string | null;
};

type SlotUnavailableDetails = {
  message: string;
  reason: string;
};

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(DoctorLeave)
    private readonly doctorLeaveRepository: Repository<DoctorLeave>,
    @InjectRepository(ClinicClosure)
    private readonly clinicClosureRepository: Repository<ClinicClosure>,
    private readonly usersService: UsersService,
  ) {}

  async create(userId: string, dto: CreateDoctorDto) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('Doctor user not found');
    }

    if (user.role !== Role.DOCTOR) {
      throw new BadRequestException(
        'Only doctor users can create doctor profiles',
      );
    }

    const existingDoctor = await this.doctorRepository.findOne({
      where: { user: { id: userId } },
    });

    if (existingDoctor) {
      throw new ConflictException(
        'Doctor profile already exists for this account',
      );
    }

    this.validateDoctorConfig(dto);

    const doctor = this.doctorRepository.create({
      user,
      doctorName: dto.doctorName,
      specialization: dto.specialization ?? null,
      address: dto.address ?? null,
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
        dto.specialization === undefined
          ? doctor.specialization
          : dto.specialization,
      address: dto.address === undefined ? doctor.address : dto.address,
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
        message: `${todaySchedule.message ?? 'No appointments available on selected date.'} No appointments available in the next ${searchWindow} days. Please contact clinic.`,
        schedule: todaySchedule,
      };
    }

    return {
      doctor: this.toDoctorResponse(doctor),
      requestedDate: startDate,
      nextAvailableDate: nextAvailable.date,
      nextAvailableSlot: nextAvailable.slot,
      searchedDays: nextAvailable.offset + 1,
      message: this.buildNextAvailableMessage(
        todaySchedule.unavailableReason,
        startDate,
        nextAvailable.date,
        nextAvailable.slot.startTime,
        isToday,
      ),
      schedule: nextAvailable.schedule,
    };
  }

  async getNextAvailable(
    doctorId: string,
    fromDate?: string,
    daysToSearch?: number,
  ) {
    const availability = await this.getAvailability(
      doctorId,
      fromDate,
      daysToSearch,
    );

    return {
      doctor: availability.doctor,
      fromDate: availability.requestedDate,
      nextAvailableDate: availability.nextAvailableDate,
      nextAvailableSlot: availability.nextAvailableSlot,
      searchedDays: availability.searchedDays,
      message: availability.message,
    };
  }

  async getSlots(doctorId: string, requestedDate?: string) {
    const doctor = await this.findDoctorEntityOrFail(doctorId);
    const date = requestedDate ?? this.getTodayDateString();
    const schedule = await this.buildDailySchedule(doctor, date);

    return {
      doctor: this.toDoctorResponse(doctor),
      ...schedule,
    };
  }

  async buildDailySchedule(doctor: Doctor, date: string) {
    const clinicClosures = await this.findClinicClosuresForDate(date);

    if (this.hasFullDayBlock(clinicClosures)) {
      return {
        date,
        isWorkingDay: false,
        totalSlots: 0,
        bookedSlots: 0,
        availableSlots: 0,
        unavailableReason: 'CLINIC_CLOSED',
        message: 'Clinic is closed on selected date.',
        slots: [],
      };
    }

    const isWorkingDay = this.isDoctorWorkingOnDate(doctor, date);
    const doctorLeaves = await this.findDoctorLeavesForDate(doctor.id, date);

    if (this.hasFullDayBlock(doctorLeaves)) {
      return {
        date,
        isWorkingDay,
        totalSlots: 0,
        bookedSlots: 0,
        availableSlots: 0,
        unavailableReason: 'DOCTOR_ON_LEAVE',
        message: 'Doctor is unavailable on selected date.',
        slots: [],
      };
    }

    const generatedSlots = isWorkingDay ? this.generateSlots(doctor) : [];

    if (generatedSlots.length === 0) {
      return {
        date,
        isWorkingDay,
        totalSlots: 0,
        bookedSlots: 0,
        availableSlots: 0,
        unavailableReason: 'DOCTOR_NOT_WORKING',
        message: 'Doctor is not available on selected date.',
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
      .filter(
        (slot) => !slot.isBooked && this.isSlotBookable(date, slot.startTime),
      )
      .filter((slot) => !this.isBlockedByAny(slot, clinicClosures))
      .filter((slot) => !this.isBlockedByAny(slot, doctorLeaves))
      .map(({ startTime, endTime }) => ({ startTime, endTime }));

    const isToday = date === this.getTodayDateString();
    const unavailableReason =
      availableSlotRows.length === 0 && isToday
        ? 'CONSULTING_TIME_OVER_OR_SLOTS_FULL'
        : availableSlotRows.length === 0
          ? 'SLOTS_FULL'
          : null;

    return {
      date,
      isWorkingDay,
      totalSlots: generatedSlots.length,
      bookedSlots: appointments.length,
      availableSlots: availableSlotRows.length,
      unavailableReason,
      message:
        availableSlotRows.length === 0
          ? this.getUnavailableMessage(unavailableReason)
          : null,
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
      (slot) =>
        this.normalizeTime(slot.startTime) === normalizedRequestedStartTime,
    );

    if (!selectedSlot) {
      const unavailableDetails =
        await this.getSlotUnavailableDetailsForBooking(
          doctor,
          appointmentDate,
          slotStartTime,
          schedule.message,
          schedule.unavailableReason,
        );
      const nextAvailable = await this.findNextAvailableDay(
        doctor,
        appointmentDate,
        doctor.nextAvailableSearchDays,
        slotStartTime,
      );

      throw new BadRequestException({
        message: unavailableDetails.message,
        reason: unavailableDetails.reason,
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

  private async findDoctorLeavesForDate(doctorId: string, date: string) {
    return this.doctorLeaveRepository.find({
      where: {
        doctor: { id: doctorId },
        startDate: LessThanOrEqual(date),
        endDate: MoreThanOrEqual(date),
      },
    });
  }

  private async findClinicClosuresForDate(date: string) {
    return this.clinicClosureRepository.find({
      where: {
        startDate: LessThanOrEqual(date),
        endDate: MoreThanOrEqual(date),
      },
    });
  }

  private hasFullDayBlock(blocks: AvailabilityBlock[]) {
    return blocks.some((block) => block.isFullDay);
  }

  private isBlockedByAny(slot: Slot, blocks: AvailabilityBlock[]) {
    return blocks.some((block) => this.isBlockedByPartialWindow(slot, block));
  }

  private isBlockedByPartialWindow(slot: Slot, block: AvailabilityBlock) {
    if (block.isFullDay || !block.startTime || !block.endTime) {
      return false;
    }

    return (
      this.normalizeTime(slot.startTime) < this.normalizeTime(block.endTime) &&
      this.normalizeTime(slot.endTime) > this.normalizeTime(block.startTime)
    );
  }

  private async getSlotUnavailableDetailsForBooking(
    doctor: Doctor,
    appointmentDate: string,
    slotStartTime: string,
    scheduleMessage?: string | null,
    scheduleReason?: string | null,
  ): Promise<SlotUnavailableDetails> {
    const normalizedRequestedStartTime = this.normalizeTime(slotStartTime);
    const generatedSlots = this.isDoctorWorkingOnDate(doctor, appointmentDate)
      ? this.generateSlots(doctor)
      : [];
    const requestedSlot = generatedSlots.find(
      (slot) =>
        this.normalizeTime(slot.startTime) === normalizedRequestedStartTime,
    );

    if (!requestedSlot) {
      return {
        message: scheduleMessage ?? 'This slot is not available for booking.',
        reason: scheduleReason ?? 'SLOT_NOT_AVAILABLE',
      };
    }

    const clinicClosures =
      await this.findClinicClosuresForDate(appointmentDate);
    if (
      this.hasFullDayBlock(clinicClosures) ||
      this.isBlockedByAny(requestedSlot, clinicClosures)
    ) {
      return {
        message: 'Clinic is closed at selected time.',
        reason: 'CLINIC_CLOSED',
      };
    }

    const doctorLeaves = await this.findDoctorLeavesForDate(
      doctor.id,
      appointmentDate,
    );
    if (
      this.hasFullDayBlock(doctorLeaves) ||
      this.isBlockedByAny(requestedSlot, doctorLeaves)
    ) {
      return {
        message: 'Doctor is unavailable at selected time.',
        reason: 'DOCTOR_NOT_AVAILABLE',
      };
    }

    const appointments = await this.appointmentRepository.find({
      where: {
        doctor: { id: doctor.id },
        appointmentDate,
        status: 'BOOKED',
      },
      order: { slotStartTime: 'ASC' },
    });
    const isBooked = appointments.some(
      (appointment) =>
        this.normalizeTime(appointment.slotStartTime) ===
        normalizedRequestedStartTime,
    );

    if (isBooked) {
      return {
        message: 'This slot is already booked.',
        reason: 'SLOT_NOT_AVAILABLE',
      };
    }

    return {
      message: scheduleMessage ?? 'This slot is not available for booking.',
      reason: scheduleReason ?? 'SLOT_NOT_AVAILABLE',
    };
  }

  private getUnavailableMessage(reason: string | null) {
    if (reason === 'CONSULTING_TIME_OVER_OR_SLOTS_FULL') {
      return 'Consultation hours are over or appointments are fully booked.';
    }

    if (reason === 'SLOTS_FULL') {
      return 'Appointments are fully booked on selected date.';
    }

    return 'Appointments are not available on selected date.';
  }

  private buildNextAvailableMessage(
    reason: string | null,
    requestedDate: string,
    nextDate: string,
    nextTime: string,
    isToday: boolean,
  ) {
    const nextSlotText = `Next available slot is on ${nextDate} at ${nextTime}.`;

    if (reason === 'CLINIC_CLOSED') {
      return `Clinic is closed on selected date. ${nextSlotText}`;
    }

    if (reason === 'DOCTOR_ON_LEAVE' || reason === 'DOCTOR_NOT_WORKING') {
      return `Doctor is unavailable on selected date. ${nextSlotText}`;
    }

    if (reason === 'CONSULTING_TIME_OVER_OR_SLOTS_FULL') {
      return `Consultation hours are over or today's appointments are fully booked. ${nextSlotText}`;
    }

    if (reason === 'SLOTS_FULL') {
      return `Appointments are fully booked on ${requestedDate}. ${nextSlotText}`;
    }

    return isToday
      ? `No appointments available today. ${nextSlotText}`
      : `No appointments available on ${requestedDate}. ${nextSlotText}`;
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
    const computedTotalSlots = this.calculateTotalSlots(doctor);
    const totalAppointmentsPerDay =
      doctor.totalAppointmentsPerDay ?? computedTotalSlots;

    const totalSlotsPerDay = totalAppointmentsPerDay
      ? Math.min(totalAppointmentsPerDay, computedTotalSlots)
      : computedTotalSlots;

    return {
      id: doctor.id,
      userId: doctor.user.id,
      doctorName: doctor.doctorName,
      specialization: doctor.specialization,
      address: doctor.address,
      availableDays: doctor.availableDays,
      weeklyOffDays: doctor.weeklyOffDays,
      consultingStartTime: doctor.consultingStartTime,
      consultingEndTime: doctor.consultingEndTime,
      slotDurationMinutes: doctor.slotDurationMinutes,
      totalAppointmentsPerDay,
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

  private calculateTotalSlots(doctor: {
    consultingStartTime: string;
    consultingEndTime: string;
    slotDurationMinutes: number;
  }) {
    return Math.floor(
      (this.timeToMinutes(doctor.consultingEndTime) -
        this.timeToMinutes(doctor.consultingStartTime)) /
        doctor.slotDurationMinutes,
    );
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
