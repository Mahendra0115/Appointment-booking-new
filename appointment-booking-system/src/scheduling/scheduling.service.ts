import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';
import { DoctorSchedulingConfig } from './entities/doctor-scheduling-config.entity';
import { CreateSchedulingConfigDto } from './dto/create-scheduling-config.dto';
import { UpdateSchedulingConfigDto } from './dto/update-scheduling-config.dto';
import { SchedulingType } from './enums/scheduling-type.enum';

@Injectable()
export class SchedulingService {
  constructor(
    @InjectRepository(DoctorSchedulingConfig)
    private readonly schedulingConfigRepository: Repository<DoctorSchedulingConfig>,
    private readonly usersService: UsersService,
  ) {}

  async createConfig(doctorId: string, dto: CreateSchedulingConfigDto) {
    const doctor = await this.validateDoctor(doctorId);

    const existingConfig = await this.findConfigEntityByDoctorId(doctorId);
    if (existingConfig) {
      throw new ConflictException('Scheduling configuration already exists');
    }

    this.validateConfig(dto.schedulingType, dto.slotDuration, dto.bufferTime, dto.waveCapacity);

    const config = this.schedulingConfigRepository.create({
      doctor,
      schedulingType: dto.schedulingType,
      slotDuration: dto.schedulingType === SchedulingType.STREAM ? dto.slotDuration ?? 15 : null,
      bufferTime: dto.schedulingType === SchedulingType.STREAM ? dto.bufferTime ?? 0 : 0,
      waveCapacity: dto.schedulingType === SchedulingType.WAVE ? dto.waveCapacity ?? 1 : null,
    });

    const savedConfig = await this.schedulingConfigRepository.save(config);
    return this.toResponse(savedConfig);
  }

  async updateConfig(doctorId: string, dto: UpdateSchedulingConfigDto) {
    const config = await this.findConfigEntityByDoctorId(doctorId);

    if (!config) {
      throw new NotFoundException('Scheduling configuration not found');
    }

    const nextSchedulingType = dto.schedulingType ?? config.schedulingType;
    const nextSlotDuration =
      dto.slotDuration ?? (nextSchedulingType === SchedulingType.STREAM ? config.slotDuration ?? undefined : undefined);
    const nextBufferTime =
      dto.bufferTime ?? (nextSchedulingType === SchedulingType.STREAM ? config.bufferTime ?? 0 : 0);
    const nextWaveCapacity =
      dto.waveCapacity ?? (nextSchedulingType === SchedulingType.WAVE ? config.waveCapacity ?? undefined : undefined);

    this.validateConfig(
      nextSchedulingType,
      nextSlotDuration,
      nextBufferTime,
      nextWaveCapacity,
    );

    config.schedulingType = nextSchedulingType;
    config.slotDuration =
      nextSchedulingType === SchedulingType.STREAM ? nextSlotDuration ?? 15 : null;
    config.bufferTime =
      nextSchedulingType === SchedulingType.STREAM ? nextBufferTime ?? 0 : 0;
    config.waveCapacity =
      nextSchedulingType === SchedulingType.WAVE ? nextWaveCapacity ?? 1 : null;

    const updatedConfig = await this.schedulingConfigRepository.save(config);
    return this.toResponse(updatedConfig);
  }

  async findConfigByDoctorId(doctorId: string) {
    const config = await this.findConfigEntityByDoctorId(doctorId);
    return config ? this.toResponse(config) : null;
  }

  async findConfigEntityByDoctorId(doctorId: string): Promise<DoctorSchedulingConfig | null> {
    return this.schedulingConfigRepository
      .createQueryBuilder('config')
      .leftJoinAndSelect('config.doctor', 'doctor')
      .where('doctor.id = :doctorId', { doctorId })
      .getOne();
  }

  private async validateDoctor(doctorId: string) {
    const doctor = await this.usersService.findById(doctorId);

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    if (doctor.role !== Role.DOCTOR) {
      throw new ForbiddenException('Only doctors can manage scheduling configuration');
    }

    return doctor;
  }

  private validateConfig(
    schedulingType: SchedulingType,
    slotDuration?: number,
    bufferTime?: number,
    waveCapacity?: number,
  ) {
    if (schedulingType === SchedulingType.STREAM) {
      if (!slotDuration || slotDuration < 5) {
        throw new BadRequestException('Valid slotDuration is required for STREAM scheduling');
      }

      if ((bufferTime ?? 0) < 0) {
        throw new BadRequestException('bufferTime cannot be negative');
      }
    }

    if (schedulingType === SchedulingType.WAVE) {
      if (!waveCapacity || waveCapacity < 1) {
        throw new BadRequestException('Valid waveCapacity is required for WAVE scheduling');
      }
    }
  }

  private toResponse(config: DoctorSchedulingConfig) {
    return {
      id: config.id,
      doctorId: config.doctor.id,
      schedulingType: config.schedulingType,
      slotDuration: config.slotDuration,
      bufferTime: config.bufferTime,
      waveCapacity: config.waveCapacity,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}