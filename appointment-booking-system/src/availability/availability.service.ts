import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';

import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';
import { RecurringAvailability } from './entities/recurring-availability.entity';
import { AvailabilityOverride } from './entities/availability-override.entity';
import { CreateRecurringAvailabilityDto } from './dto/create-recurring-availability.dto';
import { UpdateRecurringAvailabilityDto } from './dto/update-recurring-availability.dto';
import { CreateAvailabilityOverrideDto } from './dto/create-availability-override.dto';
import { UpdateAvailabilityOverrideDto } from './dto/update-availability-override.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(RecurringAvailability)
    private readonly recurringAvailabilityRepository: Repository<RecurringAvailability>,
    @InjectRepository(AvailabilityOverride)
    private readonly availabilityOverrideRepository: Repository<AvailabilityOverride>,
    private readonly usersService: UsersService,
  ) {}

  async createRecurringAvailability(
    doctorId: string,
    dto: CreateRecurringAvailabilityDto,
  ) {
    const doctor = await this.validateDoctor(doctorId);

    this.validateTimeRange(dto.startTime, dto.endTime);

    await this.ensureNoRecurringOverlap(
      doctorId,
      dto.dayOfWeek,
      dto.startTime,
      dto.endTime,
    );

    const recurring = this.recurringAvailabilityRepository.create({
      doctor,
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
    });

    const saved = await this.recurringAvailabilityRepository.save(recurring);

    return {
      id: saved.id,
      doctorId: saved.doctor.id,
      dayOfWeek: saved.dayOfWeek,
      startTime: saved.startTime,
      endTime: saved.endTime,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async updateRecurringAvailability(
    doctorId: string,
    recurringId: string,
    dto: UpdateRecurringAvailabilityDto,
  ) {
    const recurring = await this.recurringAvailabilityRepository.findOne({
      where: {
        id: recurringId,
        doctor: { id: doctorId },
      },
    });

    if (!recurring) {
      throw new NotFoundException('Recurring availability not found');
    }

    const nextDayOfWeek = dto.dayOfWeek ?? recurring.dayOfWeek;
    const nextStartTime = dto.startTime ?? recurring.startTime;
    const nextEndTime = dto.endTime ?? recurring.endTime;

    this.validateTimeRange(nextStartTime, nextEndTime);

    await this.ensureNoRecurringOverlap(
      doctorId,
      nextDayOfWeek,
      nextStartTime,
      nextEndTime,
      recurringId,
    );

    recurring.dayOfWeek = nextDayOfWeek;
    recurring.startTime = nextStartTime;
    recurring.endTime = nextEndTime;

    const updated = await this.recurringAvailabilityRepository.save(recurring);

    return {
      id: updated.id,
      doctorId: updated.doctor.id,
      dayOfWeek: updated.dayOfWeek,
      startTime: updated.startTime,
      endTime: updated.endTime,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async createAvailabilityOverride(
    doctorId: string,
    dto: CreateAvailabilityOverrideDto,
  ) {
    const doctor = await this.validateDoctor(doctorId);

    this.validateTimeRange(dto.startTime, dto.endTime);

    await this.ensureNoOverrideOverlap(
      doctorId,
      dto.overrideDate,
      dto.startTime,
      dto.endTime,
    );

    const override = this.availabilityOverrideRepository.create({
      doctor,
      overrideDate: dto.overrideDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
    });

    const saved = await this.availabilityOverrideRepository.save(override);

    return {
      id: saved.id,
      doctorId: saved.doctor.id,
      overrideDate: saved.overrideDate,
      startTime: saved.startTime,
      endTime: saved.endTime,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async updateAvailabilityOverride(
    doctorId: string,
    overrideId: string,
    dto: UpdateAvailabilityOverrideDto,
  ) {
    const override = await this.availabilityOverrideRepository.findOne({
      where: {
        id: overrideId,
        doctor: { id: doctorId },
      },
    });

    if (!override) {
      throw new NotFoundException('Availability override not found');
    }

    const nextOverrideDate = dto.overrideDate ?? override.overrideDate;
    const nextStartTime = dto.startTime ?? override.startTime;
    const nextEndTime = dto.endTime ?? override.endTime;

    this.validateTimeRange(nextStartTime, nextEndTime);

    await this.ensureNoOverrideOverlap(
      doctorId,
      nextOverrideDate,
      nextStartTime,
      nextEndTime,
      overrideId,
    );

    override.overrideDate = nextOverrideDate;
    override.startTime = nextStartTime;
    override.endTime = nextEndTime;

    const updated = await this.availabilityOverrideRepository.save(override);

    return {
      id: updated.id,
      doctorId: updated.doctor.id,
      overrideDate: updated.overrideDate,
      startTime: updated.startTime,
      endTime: updated.endTime,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  private async validateDoctor(doctorId: string) {
    const doctor = await this.usersService.findById(doctorId);

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    if (doctor.role !== Role.DOCTOR) {
      throw new ForbiddenException('Only doctors can manage availability');
    }

    return doctor;
  }

  private validateTimeRange(startTime: string, endTime: string) {
    if (startTime >= endTime) {
      throw new BadRequestException(
        'startTime must be earlier than endTime',
      );
    }
  }

  private async ensureNoRecurringOverlap(
    doctorId: string,
    dayOfWeek: string,
    startTime: string,
    endTime: string,
    ignoreId?: string,
  ) {
    const existingAvailabilities = await this.recurringAvailabilityRepository.find({
      where: {
        doctor: { id: doctorId },
        dayOfWeek: dayOfWeek as any,
        ...(ignoreId ? { id: Not(ignoreId) } : {}),
      },
    });

    for (const availability of existingAvailabilities) {
      const isOverlapping =
        startTime < availability.endTime && endTime > availability.startTime;

      if (isOverlapping) {
        throw new BadRequestException(
          'Overlapping recurring availability exists for this day',
        );
      }
    }
  }

  private async ensureNoOverrideOverlap(
    doctorId: string,
    overrideDate: string,
    startTime: string,
    endTime: string,
    ignoreId?: string,
  ) {
    const existingOverrides = await this.availabilityOverrideRepository.find({
      where: {
        doctor: { id: doctorId },
        overrideDate,
        ...(ignoreId ? { id: Not(ignoreId) } : {}),
      },
    });

    for (const availability of existingOverrides) {
      const isOverlapping =
        startTime < availability.endTime && endTime > availability.startTime;

      if (isOverlapping) {
        throw new BadRequestException(
          'Overlapping availability override exists for this date',
        );
      }
    }
  }
}




// update
