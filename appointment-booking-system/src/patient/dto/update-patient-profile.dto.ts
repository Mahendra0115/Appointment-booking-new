import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdatePatientProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => value?.trim())
  gender?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => value?.trim())
  emergencyContactPhone?: string;
}