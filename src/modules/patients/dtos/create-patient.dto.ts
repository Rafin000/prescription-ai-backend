import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

const PHONE_REGEX = /^\+?[0-9\s\-()]{6,20}$/;

export class CreatePatientDto {
  @IsString() @MaxLength(120)
  name!: string;

  @IsOptional() @IsString() @MaxLength(120)
  nameBn?: string;

  @IsInt() @Min(0) @Max(130)
  age!: number;

  @IsIn(['male', 'female', 'other'])
  sex!: 'male' | 'female' | 'other';

  @IsString() @Matches(PHONE_REGEX) @MaxLength(20)
  phone!: string;

  @IsOptional() @IsString() @MaxLength(240)
  address?: string;

  @IsOptional() @IsString() @MaxLength(8)
  bloodGroup?: string;
}

export class UpdatePatientDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(120) nameBn?: string;
  @IsOptional() @IsInt() @Min(0) @Max(130) age?: number;
  @IsOptional() @IsIn(['male', 'female', 'other']) sex?: 'male' | 'female' | 'other';
  @IsOptional() @IsString() @Matches(PHONE_REGEX) @MaxLength(20) phone?: string;
  @IsOptional() @IsString() @MaxLength(240) address?: string;
  @IsOptional() @IsString() @MaxLength(8) bloodGroup?: string;
  @IsOptional() allergies?: string[];
  @IsOptional() emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  } | null;
}
