import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class RxTemplateMedicineDto {
  @IsString() @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(120) dosage?: string;
  @IsOptional() @IsString() @MaxLength(120) frequency?: string;
  @IsOptional() @IsString() @MaxLength(120) duration?: string;
  @IsOptional() @IsString() @MaxLength(240) notes?: string;
}

export class UpsertRxTemplateDto {
  @IsString() @MaxLength(120)
  name!: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];

  @IsOptional() @IsString() @MaxLength(500)
  chiefComplaint?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  diagnoses?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  tests?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  advice?: string[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => RxTemplateMedicineDto)
  medicines?: RxTemplateMedicineDto[];

  @IsOptional() @IsString() @MaxLength(240)
  followUp?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  notes?: string;

  /** True → save as a team-shared template (doctor_id = null). Owner-only. */
  @IsOptional() @IsBoolean()
  shared?: boolean;
}
