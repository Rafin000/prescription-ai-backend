import { Type } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const PHONE_REGEX = /^\+?[0-9\s\-()]{6,20}$/;

export class AppointmentPatientDraftDto {
  @IsString() @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(120) nameBn?: string;
  @IsInt() @Min(0) @Max(130) age!: number;
  @IsIn(['male', 'female', 'other']) sex!: 'male' | 'female' | 'other';
  @IsString() @Matches(PHONE_REGEX) @MaxLength(20) phone!: string;
  @IsOptional() @IsString() @MaxLength(240) address?: string;
  @IsOptional() @IsString() @MaxLength(8) bloodGroup?: string;
}

export class CreateAppointmentDto {
  @IsOptional() @IsUUID('4')
  patientId?: string;

  @IsString() @MaxLength(120)
  patientName!: string;

  @IsOptional() @ValidateNested() @Type(() => AppointmentPatientDraftDto)
  patientDraft?: AppointmentPatientDraftDto;

  @IsISO8601()
  start!: string;

  @IsISO8601()
  end!: string;

  @IsIn(['in-person', 'tele', 'surgery', 'follow-up'])
  type!: 'in-person' | 'tele' | 'surgery' | 'follow-up';

  @IsUUID('4')
  chamberId!: string;

  @IsOptional() @IsString() @MaxLength(500)
  note?: string;

  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;

  @IsOptional() @IsString() @MaxLength(120)
  procedure?: string;

  @IsOptional() @IsString() @MaxLength(120)
  hospital?: string;
}

export class UpdateAppointmentDto {
  @IsOptional() @IsISO8601() start?: string;
  @IsOptional() @IsISO8601() end?: string;
  @IsOptional() @IsIn(['pending', 'confirmed', 'cancelled', 'noshow', 'done'])
  status?: 'pending' | 'confirmed' | 'cancelled' | 'noshow' | 'done';
  @IsOptional() @IsIn(['in-person', 'tele', 'surgery', 'follow-up'])
  type?: 'in-person' | 'tele' | 'surgery' | 'follow-up';
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
  @IsOptional() @IsString() @MaxLength(120) procedure?: string;
  @IsOptional() @IsString() @MaxLength(120) hospital?: string;
  @IsOptional() @IsUUID('4') chamberId?: string;
  @IsOptional() @IsUUID('4') patientId?: string;
  @IsOptional() @IsString() @MaxLength(120) patientName?: string;
}
