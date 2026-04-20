import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ChamberDraftDto {
  @IsOptional() @IsUUID('4')
  id?: string;

  @IsString() @MaxLength(120)
  name!: string;

  @IsString() @MaxLength(240)
  address!: string;

  @IsOptional() @IsString() @MaxLength(20)
  phone?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  days?: string[];

  @IsOptional() @IsString() @MaxLength(60)
  time?: string;

  @IsOptional() @IsString() @MaxLength(60)
  area?: string;

  @IsOptional() @IsString() @MaxLength(60)
  city?: string;

  @IsOptional() @Type(() => Number) @IsLatitude()
  lat?: number;

  @IsOptional() @Type(() => Number) @IsLongitude()
  lng?: number;
}

export class SaveChambersDto {
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => ChamberDraftDto)
  chambers!: ChamberDraftDto[];
}
