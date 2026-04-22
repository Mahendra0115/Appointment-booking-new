import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateDoctorProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => value?.trim())
  specialization?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(({ value }) => value?.trim())
  qualification?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  experienceYears?: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(({ value }) => value?.trim())
  clinicName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  consultationFee?: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  bio?: string;
  
}