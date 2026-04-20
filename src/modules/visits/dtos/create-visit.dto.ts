import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class RxMedicineDto {
  @IsString() @MaxLength(120)
  name!: string;

  @IsOptional() @IsString() @MaxLength(120) dosage?: string;
  @IsOptional() @IsString() @MaxLength(120) frequency?: string;
  @IsOptional() @IsString() @MaxLength(120) duration?: string;
  @IsOptional() @IsString() @MaxLength(240) notes?: string;
}

export class RxDraftDto {
  @IsString() @MaxLength(500)
  chiefComplaint!: string;

  @IsArray() @IsString({ each: true })
  diagnoses!: string[];

  @IsArray() @IsString({ each: true })
  tests!: string[];

  @IsArray() @IsString({ each: true })
  advice!: string[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => RxMedicineDto)
  medicines!: RxMedicineDto[];

  @IsOptional() @IsString() @MaxLength(240)
  followUp?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  notes?: string;

  @IsOptional() @IsString() @MaxLength(500)
  operation?: string;
}

export class CreateVisitDto {
  @IsUUID('4')
  patientId!: string;

  @IsString() @MaxLength(120)
  patientName!: string;

  @IsIn(['consultation', 'follow-up', 'tele'])
  type!: 'consultation' | 'follow-up' | 'tele';

  @IsISO8601()
  startedAt!: string;

  @IsInt() @Min(0)
  durationSec!: number;

  @IsIn(['final', 'draft', 'none'])
  rxStatus!: 'final' | 'draft' | 'none';

  @IsOptional() @IsBoolean()
  printed?: boolean;

  @IsOptional() @ValidateNested() @Type(() => RxDraftDto)
  draft?: RxDraftDto;
}

export class FinalizeDraftDto {
  @ValidateNested() @Type(() => RxDraftDto)
  draft!: RxDraftDto;

  @IsOptional() @IsBoolean()
  printed?: boolean;
}

export class UpdateDraftDto {
  @ValidateNested() @Type(() => RxDraftDto)
  draft!: RxDraftDto;
}
