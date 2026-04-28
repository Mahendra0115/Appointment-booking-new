import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';

import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';

import { PatientProfile } from './entities/patient-profile.entity';
import { PatientService } from './patient.service';

describe('PatientService', () => {
  let service: PatientService;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let usersService: { findById: jest.Mock; toUserResponse: jest.Mock };
  let queryBuilder: { leftJoinAndSelect: jest.Mock; where: jest.Mock; getOne: jest.Mock };

  const user = {
    id: 'patient-user-id',
    fullName: 'Rahul Verma',
    email: 'rahul@example.com',
    role: Role.PATIENT,
  };
  const profile = {
    id: 'profile-id',
    user,
    gender: 'MALE',
    dateOfBirth: '1995-04-20',
    phone: '9876543210',
    address: 'Delhi',
    emergencyContactName: 'Asha',
    emergencyContactPhone: '9876543211',
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
        PatientService,
        { provide: getRepositoryToken(PatientProfile), useValue: repository },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<PatientService>(PatientService);
  });

  it('should create a patient onboarding profile', async () => {
    const result = await service.createProfile('patient-user-id', {
      gender: 'MALE',
      dateOfBirth: '1995-04-20',
      phone: '9876543210',
      address: 'Delhi',
      emergencyContactName: 'Asha',
      emergencyContactPhone: '9876543211',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user,
        phone: '9876543210',
        isOnboardingCompleted: true,
      }),
    );
    expect(result).toMatchObject({
      id: 'profile-id',
      userId: 'patient-user-id',
      phone: '9876543210',
    });
  });

  it('should reject duplicate patient profile', async () => {
    queryBuilder.getOne.mockResolvedValue(profile);

    await expect(
      service.createProfile('patient-user-id', {
        gender: 'MALE',
        dateOfBirth: '1995-04-20',
        phone: '9876543210',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should reject non-patient users', async () => {
    usersService.findById.mockResolvedValue({ ...user, role: Role.DOCTOR });

    await expect(
      service.createProfile('patient-user-id', {
        gender: 'MALE',
        dateOfBirth: '1995-04-20',
        phone: '9876543210',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should update an existing profile', async () => {
    queryBuilder.getOne.mockResolvedValue({ ...profile });

    const result = await service.updateProfile('patient-user-id', {
      address: 'Mumbai',
    });

    expect(result.address).toBe('Mumbai');
  });

  it('should throw when profile is missing', async () => {
    await expect(
      service.getMyOnboardingProfile('patient-user-id'),
    ).rejects.toThrow(NotFoundException);
  });
});
