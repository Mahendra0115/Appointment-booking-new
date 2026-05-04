import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    createUser: jest.Mock;
    findByEmailWithPassword: jest.Mock;
    toUserResponse: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock };

  const user = {
    id: 'user-id',
    fullName: 'Dr. Meera Sharma',
    email: 'doctor@example.com',
    password: 'hashed-password',
    role: Role.DOCTOR,
    createdAt: new Date('2099-01-01T00:00:00.000Z'),
    updatedAt: new Date('2099-01-01T00:00:00.000Z'),
  } as User;

  beforeEach(async () => {
    usersService = {
      createUser: jest.fn().mockResolvedValue(user),
      findByEmailWithPassword: jest.fn().mockResolvedValue(user),
      toUserResponse: jest.fn((savedUser: User) => ({
        id: savedUser.id,
        fullName: savedUser.fullName,
        email: savedUser.email,
        role: savedUser.role,
      })),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    };
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should sign up a user and return an access token', async () => {
    const result = await service.signup({
      fullName: 'Dr. Meera Sharma',
      email: 'doctor@example.com',
      password: 'password123',
      role: Role.DOCTOR,
    });

    expect(usersService.createUser).toHaveBeenCalled();
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-id',
      email: 'doctor@example.com',
      role: Role.DOCTOR,
    });
    expect(result.accessToken).toBe('signed-token');
    expect(result.user).not.toHaveProperty('password');
  });

  it('should log in a user with valid credentials', async () => {
    const result = await service.login({
      email: 'doctor@example.com',
      password: 'password123',
    });

    expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
    expect(result.accessToken).toBe('signed-token');
  });

  it('should reject login when user is not found', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'missing@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should reject login when password does not match', async () => {
    jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      service.login({
        email: 'doctor@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
