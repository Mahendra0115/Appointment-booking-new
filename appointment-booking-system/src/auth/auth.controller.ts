import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { AuthService } from './auth.service';
import { LoginRequestDto } from './dto/login-request.dto';
import { SignupRequestDto } from './dto/signup-request.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(
    @Body() signupDto: SignupRequestDto,
  ): Promise<ApiResponseDto<AuthResponseDto>> {
    const result = await this.authService.signup(signupDto);
    return new ApiResponseDto(true, 'Signup successful', result);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() loginDto: LoginRequestDto,
  ): Promise<ApiResponseDto<AuthResponseDto>> {
    const result = await this.authService.login(loginDto);
    return new ApiResponseDto(true, 'Login successful', result);
  }

  
}