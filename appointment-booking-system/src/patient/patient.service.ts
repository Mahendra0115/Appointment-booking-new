import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';

import { PatientProfile } from './entities/patient-profile.entity';
import { CreatePatientProfileDto } from './dto/create-patient-profile.dto';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';
import { PatientProfileResponseDto } from './dto/patient-profile-response.dto';

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(PatientProfile)
    private readonly patientProfileRepository: Repository<PatientProfile>,
    private readonly usersService: UsersService,
  ) {}

  
  // ===== Task 3 methods (preserved) =====
  async getPatientProfile(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('Patient not found');
    }

    return this.usersService.toUserResponse(user);
  }

  getPatientDashboard(user: JwtPayload) {
    return {
      patientId: user.sub,
      email: user.email,
      role: user.role,
      modules: {
        appointmentBooking: true,
        appointmentHistory: true,
        profileAccess: true,
      },
      message: 'Patient dashboard access granted',
    };
  }

  // ===== Task 4 methods (added) =====
  async createProfile(
    userId: string,
    createDto: CreatePatientProfileDto,
  ): Promise<PatientProfileResponseDto> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('Patient user not found');
    }

    if (user.role !== Role.PATIENT) {
      throw new ForbiddenException('Only patients can create patient profile');
    }

    const existingProfile = await this.findProfileEntityByUserId(userId);
    if (existingProfile) {
      throw new ConflictException('Patient profile already exists');
    }

    const profile = this.patientProfileRepository.create({
      user,
      gender: createDto.gender,
      dateOfBirth: createDto.dateOfBirth,
      phone: createDto.phone,
      address: createDto.address,
      emergencyContactName: createDto.emergencyContactName,
      emergencyContactPhone: createDto.emergencyContactPhone,
      isOnboardingCompleted: true,
    });

    const savedProfile = await this.patientProfileRepository.save(profile);
    return this.toPatientProfileResponse(savedProfile);
  }

  async updateProfile(
    userId: string,
    updateDto: UpdatePatientProfileDto,
  ): Promise<PatientProfileResponseDto> {
    const profile = await this.findProfileEntityByUserId(userId);

    if (!profile) {
      throw new NotFoundException('Patient profile not found');
    }

    Object.assign(profile, updateDto);

    const updatedProfile = await this.patientProfileRepository.save(profile);
    return this.toPatientProfileResponse(updatedProfile);
  }

  async getMyOnboardingProfile(
    userId: string,
  ): Promise<PatientProfileResponseDto> {
    const profile = await this.findProfileEntityByUserId(userId);

    if (!profile) {
      throw new NotFoundException('Patient profile not found');
    }

    return this.toPatientProfileResponse(profile);
  }

  async findProfileEntityByUserId(userId: string): Promise<PatientProfile | null> {
    return this.patientProfileRepository
      .createQueryBuilder('patientProfile')
      .leftJoinAndSelect('patientProfile.user', 'user')
      .where('user.id = :userId', { userId })
      .getOne();
  }

  toPatientProfileResponse(profile: PatientProfile): PatientProfileResponseDto {
    return {
      id: profile.id,
      userId: profile.user.id,
      fullName: profile.user.fullName,
      email: profile.user.email,
      gender: profile.gender,
      dateOfBirth: profile.dateOfBirth,
      phone: profile.phone,
      address: profile.address,
      emergencyContactName: profile.emergencyContactName,
      emergencyContactPhone: profile.emergencyContactPhone,
      isOnboardingCompleted: profile.isOnboardingCompleted,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}