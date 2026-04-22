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

import { DoctorProfile } from './entities/doctor-profile.entity';
import { CreateDoctorProfileDto } from './dto/create-doctor-profile.dto';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';
import { DoctorProfileResponseDto } from './dto/doctor-profile-response.dto';

@Injectable()
export class DoctorService {
  constructor(
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
    private readonly usersService: UsersService,
  ) {}

  // ===== Task 3 methods (preserved) =====
  async getDoctorProfile(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('Doctor not found');
    }

    return this.usersService.toUserResponse(user);
  }

  getDoctorDashboard(user: JwtPayload) {
    return {
      doctorId: user.sub,
      email: user.email,
      role: user.role,
      modules: {
        appointments: true,
        availabilityManagement: true,
        consultationDashboard: true,
      },
      message: 'Doctor dashboard access granted',
    };
  }

  // ===== Task 4 methods (added) =====
  async createProfile(
    userId: string,
    createDto: CreateDoctorProfileDto,
  ): Promise<DoctorProfileResponseDto> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('Doctor user not found');
    }

    if (user.role !== Role.DOCTOR) {
      throw new ForbiddenException('Only doctors can create doctor profile');
    }

    const existingProfile = await this.findProfileEntityByUserId(userId);
    if (existingProfile) {
      throw new ConflictException('Doctor profile already exists');
    }

    const profile = this.doctorProfileRepository.create({
      user,
      specialization: createDto.specialization,
      qualification: createDto.qualification,
      experienceYears: createDto.experienceYears,
      clinicName: createDto.clinicName,
      consultationFee: createDto.consultationFee,
      bio: createDto.bio,
      isOnboardingCompleted: true,
    });

    const savedProfile = await this.doctorProfileRepository.save(profile);
    return this.toDoctorProfileResponse(savedProfile);
  }

  async updateProfile(
    userId: string,
    updateDto: UpdateDoctorProfileDto,
  ): Promise<DoctorProfileResponseDto> {
    const profile = await this.findProfileEntityByUserId(userId);

    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    Object.assign(profile, updateDto);

    const updatedProfile = await this.doctorProfileRepository.save(profile);
    return this.toDoctorProfileResponse(updatedProfile);
  }

  async getMyOnboardingProfile(
    userId: string,
  ): Promise<DoctorProfileResponseDto> {
    const profile = await this.findProfileEntityByUserId(userId);

    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    return this.toDoctorProfileResponse(profile);
  }

  async findProfileEntityByUserId(userId: string): Promise<DoctorProfile | null> {
    return this.doctorProfileRepository
      .createQueryBuilder('doctorProfile')
      .leftJoinAndSelect('doctorProfile.user', 'user')
      .where('user.id = :userId', { userId })
      .getOne();
  }

  toDoctorProfileResponse(profile: DoctorProfile): DoctorProfileResponseDto {
    return {
      id: profile.id,
      userId: profile.user.id,
      fullName: profile.user.fullName,
      email: profile.user.email,
      specialization: profile.specialization,
      qualification: profile.qualification,
      experienceYears: profile.experienceYears,
      clinicName: profile.clinicName,
      consultationFee: profile.consultationFee
        ? Number(profile.consultationFee)
        : undefined,
      bio: profile.bio,
      isOnboardingCompleted: profile.isOnboardingCompleted,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
  
}