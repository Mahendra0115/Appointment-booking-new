import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { LoginRequestDto } from './dto/login-request.dto';
import { SignupRequestDto } from './dto/signup-request.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupRequestDto): Promise<AuthResponseDto> {
    const user = await this.usersService.createUser(signupDto);
    const accessToken = await this.generateAccessToken(user);

    return {
      accessToken,
      user: this.usersService.toUserResponse(user),
    };
  }

  async login(loginDto: LoginRequestDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmailWithPassword(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.generateAccessToken(user);

    return {
      accessToken,
      user: this.usersService.toUserResponse(user),
    };

    
  }

  private async generateAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.signAsync(payload);
  }
}