import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class UploadHintsDto {
  @IsOptional() @IsUUID('4') patientId?: string;
  @IsOptional() @IsString() @MaxLength(120) testId?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class UploadLabIntakeDto {
  @IsString() @MaxLength(240)
  filename!: string;

  @IsInt() @Min(0)
  sizeKb!: number;

  @IsString() @MaxLength(120)
  mime!: string;

  @IsOptional() @ValidateNested() @Type(() => UploadHintsDto)
  hints?: UploadHintsDto;
}

export class AssignLabIntakeDto {
  @IsUUID('4')
  patientId!: string;

  @IsOptional() @IsString() @MaxLength(120)
  testId?: string;
}
