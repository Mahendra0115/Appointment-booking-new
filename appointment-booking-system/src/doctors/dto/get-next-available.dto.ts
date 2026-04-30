import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class GetNextAvailableDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  daysToSearch?: number;
}
