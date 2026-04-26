import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';

import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';

import { DoctorProfile } from './entities/doctor-profile.entity';
import { DoctorService } from './doctor.service';

describe('DoctorService', () => {
  let service: DoctorService;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let usersService: { findById: jest.Mock; toUserResponse: jest.Mock };
  let queryBuilder: { leftJoinAndSelect: jest.Mock; where: jest.Mock; getOne: jest.Mock };

  const user = {
    id: 'doctor-user-id',
    fullName: 'Dr. Meera Sharma',
    email: 'meera@example.com',
    role: Role.DOCTOR,
  };
  const profile = {
    id: 'profile-id',
    user,
    specialization: 'Cardiology',
    qualification: 'MD',
    experienceYears: 8,
    clinicName: 'Care Clinic',
    consultationFee: '500',
    bio: 'Heart specialist',
    isOnboardingCompleted: true,
    createdAt: new Date('2099-01-01T00:00:00.000Z'),
    updatedAt: new Date('2099-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    repository = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ ...profile, ...data })),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    usersService = {
      findById: jest.fn().mockResolvedValue(user),
      toUserResponse: jest.fn((data) => ({ id: data.id, email: data.email })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorService,
        { provide: getRepositoryToken(DoctorProfile), useValue: repository },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<DoctorService>(DoctorService);
  });

  it('should create a doctor onboarding profile', async () => {
    const result = await service.createProfile('doctor-user-id', {
      specialization: 'Cardiology',
      qualification: 'MD',
      experienceYears: 8,
      clinicName: 'Care Clinic',
      consultationFee: 500,
      bio: 'Heart specialist',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user,
        specialization: 'Cardiology',
        isOnboardingCompleted: true,
      }),
    );
    expect(result).toMatchObject({
      id: 'profile-id',
      userId: 'doctor-user-id',
      consultationFee: 500,
    });
  });

  it('should reject duplicate doctor profile', async () => {
    queryBuilder.getOne.mockResolvedValue(profile);

    await expect(
      service.createProfile('doctor-user-id', {
        specialization: 'Cardiology',
        qualification: 'MD',
        experienceYears: 8,
        clinicName: 'Care Clinic',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should reject non-doctor users', async () => {
    usersService.findById.mockResolvedValue({ ...user, role: Role.PATIENT });

    await expect(
      service.createProfile('doctor-user-id', {
        specialization: 'Cardiology',
        qualification: 'MD',
        experienceYears: 8,
        clinicName: 'Care Clinic',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should update an existing profile', async () => {
    queryBuilder.getOne.mockResolvedValue({ ...profile });

    const result = await service.updateProfile('doctor-user-id', {
      clinicName: 'New Clinic',
    });

    expect(result.clinicName).toBe('New Clinic');
  });

  it('should throw when profile is missing', async () => {
    await expect(
      service.getMyOnboardingProfile('doctor-user-id'),
    ).rejects.toThrow(NotFoundException);
  });
});
