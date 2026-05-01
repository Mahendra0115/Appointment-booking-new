import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ApiResponseDto } from '../common/dto/api-response.dto';
import { Doctor } from '../doctors/entities/doctor.entity';

import { CreateClinicClosureDto } from './dto/create-clinic-closure.dto';
import { ClinicClosure } from './entities/clinic-closure.entity';

@Injectable()
export class ClinicClosuresService {
  constructor(
    @InjectRepository(ClinicClosure)
    private readonly clinicClosureRepository: Repository<ClinicClosure>,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
  ) {}

  async createForDoctorUser(userId: string, dto: CreateClinicClosureDto) {
    const doctor = await this.doctorRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found for this user');
    }

    this.validateClosureWindow(dto);

    const closure = this.clinicClosureRepository.create({
      doctor,
      startDate: dto.startDate,
      endDate: dto.endDate,
      isFullDay: dto.isFullDay ?? true,
      startTime: dto.isFullDay === false ? dto.startTime : null,
      endTime: dto.isFullDay === false ? dto.endTime : null,
      reason: dto.reason ?? null,
    });

    const saved = await this.clinicClosureRepository.save(closure);

    return new ApiResponseDto(
      true,
      'Clinic closure created successfully',
      this.toResponse(saved),
    );
  }

  private validateClosureWindow(dto: CreateClinicClosureDto) {
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    if (dto.isFullDay === false) {
      if (!dto.startTime || !dto.endTime) {
        throw new BadRequestException(
          'startTime and endTime are required for partial day closure',
        );
      }

      if (dto.startTime >= dto.endTime) {
        throw new BadRequestException('endTime must be later than startTime');
      }
    }
  }

  private toResponse(closure: ClinicClosure) {
    return {
      id: closure.id,
      doctorId: closure.doctor?.id ?? null,
      startDate: closure.startDate,
      endDate: closure.endDate,
      isFullDay: closure.isFullDay,
      startTime: closure.startTime,
      endTime: closure.endTime,
      reason: closure.reason,
      createdAt: closure.createdAt,
      updatedAt: closure.updatedAt,
    };
  }
}
