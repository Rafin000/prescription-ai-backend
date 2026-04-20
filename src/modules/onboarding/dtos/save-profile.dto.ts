import { IsArray, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

const PHONE_REGEX = /^\+?[0-9\s\-()]{6,20}$/;

export class SaveProfileDto {
  @IsString() @Length(2, 80)
  name!: string;

  @IsOptional() @IsString() @MaxLength(80)
  nameBn?: string;

  @IsString() @MaxLength(40)
  bmdcNo!: string;

  @IsString() @Length(2, 60)
  specialty!: string;

  @IsArray() @IsString({ each: true })
  degrees!: string[];

  @IsString() @Matches(PHONE_REGEX) @MaxLength(20)
  phone!: string;

  @IsString() @MaxLength(120)
  email!: string;

  @IsOptional() @IsString() @MaxLength(500)
  signatureUrl?: string;
}
