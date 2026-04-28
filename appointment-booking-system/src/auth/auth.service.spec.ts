import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { Role } from '../common/enums/role.enum';
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
    fullName: 'Rahul Verma',
    email: 'rahul@example.com',
    password: 'hashed-password',
    role: Role.PATIENT,
    createdAt: new Date('2099-01-01T00:00:00.000Z'),
    updatedAt: new Date('2099-01-01T00:00:00.000Z'),
  };
  const userResponse = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  beforeEach(async () => {
    usersService = {
      createUser: jest.fn().mockResolvedValue(user),
      findByEmailWithPassword: jest.fn().mockResolvedValue(user),
      toUserResponse: jest.fn().mockReturnValue(userResponse),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('access-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create user and return access token on signup', async () => {
    const result = await service.signup({
      fullName: 'Rahul Verma',
      email: 'rahul@example.com',
      password: 'secret123',
      role: Role.PATIENT,
    });

    expect(usersService.createUser).toHaveBeenCalledWith({
      fullName: 'Rahul Verma',
      email: 'rahul@example.com',
      password: 'secret123',
      role: Role.PATIENT,
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-id',
      email: 'rahul@example.com',
      role: Role.PATIENT,
    });
    expect(result).toEqual({
      accessToken: 'access-token',
      user: userResponse,
    });
  });

  it('should return access token when login credentials are valid', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.login({
      email: 'rahul@example.com',
      password: 'secret123',
    });

    expect(usersService.findByEmailWithPassword).toHaveBeenCalledWith(
      'rahul@example.com',
    );
    expect(bcrypt.compare).toHaveBeenCalledWith('secret123', 'hashed-password');
    expect(result).toEqual({
      accessToken: 'access-token',
      user: userResponse,
    });
  });

  it('should throw when login email does not exist', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'missing@example.com',
        password: 'secret123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw when login password is invalid', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({
        email: 'rahul@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
