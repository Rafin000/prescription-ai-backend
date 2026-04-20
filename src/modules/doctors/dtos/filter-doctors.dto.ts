import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class FilterDoctorsDto {
  /** Free-text search (name, specialty, area). Trigram-matched. */
  @IsOptional() @IsString() @MaxLength(120)
  q?: string;

  @IsOptional() @IsString() @MaxLength(60)
  specialty?: string;

  @IsOptional() @IsString() @MaxLength(60)
  area?: string;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  nearLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  nearLng?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 24;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  offset: number = 0;

  /** Only doctors offering video consults. */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  tele?: boolean;
}
