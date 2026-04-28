import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DoctorProfile } from '../doctor/entities/doctor-profile.entity';
import { DoctorDiscoveryQueryDto } from './dto/doctor-discovery-query.dto';

@Injectable()
export class DiscoveryService {
  constructor(
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
  ) {}

  async getDoctors(query: DoctorDiscoveryQueryDto) {
    const queryBuilder = this.doctorProfileRepository
      .createQueryBuilder('doctorProfile')
      .leftJoinAndSelect('doctorProfile.user', 'user')
      .where('doctorProfile.isOnboardingCompleted = :isCompleted', {
        isCompleted: true,
      });

    if (query.specialization) {
      queryBuilder.andWhere(
        'LOWER(doctorProfile.specialization) LIKE LOWER(:specialization)',
        { specialization: `%${query.specialization}%` },
      );
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(LOWER(user.fullName) LIKE LOWER(:search) OR LOWER(doctorProfile.clinicName) LIKE LOWER(:search))',
        { search: `%${query.search}%` },
      );
    }

    const profiles = await queryBuilder
      .orderBy('doctorProfile.createdAt', 'DESC')
      .getMany();

    return profiles.map((profile) => ({
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
    }));
  }

  async getDoctorById(profileId: string) {
    const profile = await this.doctorProfileRepository
      .createQueryBuilder('doctorProfile')
      .leftJoinAndSelect('doctorProfile.user', 'user')
      .where('doctorProfile.id = :profileId', { profileId })
      .andWhere('doctorProfile.isOnboardingCompleted = :isCompleted', {
        isCompleted: true,
      })
      .getOne();

    if (!profile) {
      throw new NotFoundException('Doctor not found');
    }

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
    };
  }
  
}