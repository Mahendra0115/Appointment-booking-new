import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ApiResponseDto } from '../common/dto/api-response.dto';
import { Doctor } from '../doctors/entities/doctor.entity';

import { CreateDoctorLeaveDto } from './dto/create-doctor-leave.dto';
import { DoctorLeave } from './entities/doctor-leave.entity';

@Injectable()
export class DoctorLeavesService {
  constructor(
    @InjectRepository(DoctorLeave)
    private readonly doctorLeaveRepository: Repository<DoctorLeave>,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
  ) {}

  async createForDoctorUser(userId: string, dto: CreateDoctorLeaveDto) {
    const doctor = await this.doctorRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found for this user');
    }

    this.validateLeaveWindow(dto);

    const leave = this.doctorLeaveRepository.create({
      doctor,
      startDate: dto.startDate,
      endDate: dto.endDate,
      isFullDay: dto.isFullDay ?? true,
      startTime: dto.isFullDay === false ? dto.startTime : null,
      endTime: dto.isFullDay === false ? dto.endTime : null,
      reason: dto.reason ?? null,
    });

    const saved = await this.doctorLeaveRepository.save(leave);

    return new ApiResponseDto(
      true,
      'Doctor leave created successfully',
      this.toResponse(saved),
    );
  }

  private validateLeaveWindow(dto: CreateDoctorLeaveDto) {
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    if (dto.isFullDay === false) {
      if (!dto.startTime || !dto.endTime) {
        throw new BadRequestException(
          'startTime and endTime are required for partial day leave',
        );
      }

      if (dto.startTime >= dto.endTime) {
        throw new BadRequestException('endTime must be later than startTime');
      }
    }
  }

  private toResponse(leave: DoctorLeave) {
    return {
      id: leave.id,
      doctorId: leave.doctor.id,
      startDate: leave.startDate,
      endDate: leave.endDate,
      isFullDay: leave.isFullDay,
      startTime: leave.startTime,
      endTime: leave.endTime,
      reason: leave.reason,
      createdAt: leave.createdAt,
      updatedAt: leave.updatedAt,
    };
  }
}
