import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';

import { DoctorProfile } from '../doctor/entities/doctor-profile.entity';

import { DiscoveryService } from './discovery.service';

describe('DiscoveryService', () => {
  let service: DiscoveryService;
  let repository: { createQueryBuilder: jest.Mock };
  let queryBuilder: {
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    getMany: jest.Mock;
    getOne: jest.Mock;
  };

  const profile = {
    id: 'profile-id',
    user: {
      id: 'doctor-user-id',
      fullName: 'Dr. Meera Sharma',
      email: 'meera@example.com',
    },
    specialization: 'Cardiology',
    qualification: 'MD',
    experienceYears: 8,
    clinicName: 'Care Clinic',
    consultationFee: '500',
    bio: 'Heart specialist',
  };

  beforeEach(async () => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([profile]),
      getOne: jest.fn().mockResolvedValue(profile),
    };
    repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        { provide: getRepositoryToken(DoctorProfile), useValue: repository },
      ],
    }).compile();

    service = module.get<DiscoveryService>(DiscoveryService);
  });

  it('should list onboarded doctors and apply filters', async () => {
    const result = await service.getDoctors({
      specialization: 'cardio',
      search: 'care',
    });

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'doctorProfile.isOnboardingCompleted = :isCompleted',
      { isCompleted: true },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      {
        id: 'profile-id',
        userId: 'doctor-user-id',
        fullName: 'Dr. Meera Sharma',
        email: 'meera@example.com',
        specialization: 'Cardiology',
        qualification: 'MD',
        experienceYears: 8,
        clinicName: 'Care Clinic',
        consultationFee: 500,
        bio: 'Heart specialist',
      },
    ]);
  });

  it('should return one onboarded doctor by profile id', async () => {
    const result = await service.getDoctorById('profile-id');

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'doctorProfile.id = :profileId',
      { profileId: 'profile-id' },
    );
    expect(result).toMatchObject({
      id: 'profile-id',
      userId: 'doctor-user-id',
      consultationFee: 500,
    });
  });

  it('should throw when doctor profile is not found', async () => {
    queryBuilder.getOne.mockResolvedValue(null);

    await expect(service.getDoctorById('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});
