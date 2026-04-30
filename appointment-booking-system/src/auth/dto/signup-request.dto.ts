import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class SignupRequestDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  fullName: string;

  @IsEmail()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(Role)
  role: Role;
  
}