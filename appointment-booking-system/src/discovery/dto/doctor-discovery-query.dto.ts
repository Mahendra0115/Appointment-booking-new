import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DoctorDiscoveryQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => value?.trim())
  specialization?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => value?.trim())
  search?: string;
  
}