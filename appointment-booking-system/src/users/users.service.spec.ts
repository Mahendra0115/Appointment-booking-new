import { ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { Role } from '../common/enums/role.enum';

import { User } from './entities/user.entity';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let queryBuilder: {
    addSelect: jest.Mock;
    where: jest.Mock;
    getOne: jest.Mock;
  };

  const user = {
    id: 'user-id',
    fullName: 'Rahul Verma',
    email: 'rahul@example.com',
    password: 'hashed-password',
    role: Role.PATIENT,
    createdAt: new Date('2099-01-01T00:00:00.000Z'),
    updatedAt: new Date('2099-01-01T00:00:00.000Z'),
  } as User;

  beforeEach(async () => {
    queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    userRepository = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'user-id', ...data })),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a user with lowercase email and hashed password', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

    const result = await service.createUser({
      fullName: 'Rahul Verma',
      email: 'RAHUL@EXAMPLE.COM',
      password: 'secret123',
      role: Role.PATIENT,
    });

    expect(userRepository.create).toHaveBeenCalledWith({
      fullName: 'Rahul Verma',
      email: 'rahul@example.com',
      password: 'hashed-password',
      role: Role.PATIENT,
    });
    expect(result).toMatchObject({
      id: 'user-id',
      fullName: 'Rahul Verma',
      email: 'rahul@example.com',
      role: Role.PATIENT,
    });
  });

  it('should throw when email is already registered', async () => {
    queryBuilder.getOne.mockResolvedValue(user);

    await expect(
      service.createUser({
        fullName: 'Rahul Verma',
        email: 'rahul@example.com',
        password: 'secret123',
        role: Role.PATIENT,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should find user by email case-insensitively', async () => {
    queryBuilder.getOne.mockResolvedValue(user);

    const result = await service.findByEmail('RAHUL@EXAMPLE.COM');

    expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'LOWER(user.email) = LOWER(:email)',
      { email: 'RAHUL@EXAMPLE.COM' },
    );
    expect(result).toBe(user);
  });

  it('should include password when finding user for login', async () => {
    queryBuilder.getOne.mockResolvedValue(user);

    const result = await service.findByEmailWithPassword('rahul@example.com');

    expect(queryBuilder.addSelect).toHaveBeenCalledWith('user.password');
    expect(result).toBe(user);
  });

  it('should find user by id', async () => {
    userRepository.findOne.mockResolvedValue(user);

    const result = await service.findById('user-id');

    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'user-id' },
    });
    expect(result).toBe(user);
  });

  it('should convert user entity to response without password', () => {
    expect(service.toUserResponse(user)).toEqual({
      id: 'user-id',
      fullName: 'Rahul Verma',
      email: 'rahul@example.com',
      role: Role.PATIENT,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  });
});
