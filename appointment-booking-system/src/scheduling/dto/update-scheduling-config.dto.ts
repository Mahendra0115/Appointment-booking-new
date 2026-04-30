import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Min,
  ValidateIf,
} from 'class-validator';
import { SchedulingType } from '../enums/scheduling-type.enum';

export class UpdateSchedulingConfigDto {
  @IsOptional()
  @IsEnum(SchedulingType)
  schedulingType?: SchedulingType;

  @ValidateIf((o) => o.schedulingType === SchedulingType.STREAM || o.slotDuration !== undefined)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  slotDuration?: number;

  @ValidateIf((o) => o.schedulingType === SchedulingType.STREAM || o.bufferTime !== undefined)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bufferTime?: number;

  @ValidateIf((o) => o.schedulingType === SchedulingType.WAVE || o.waveCapacity !== undefined)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  waveCapacity?: number;
}