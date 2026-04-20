import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

const PHONE_REGEX = /^\+?[0-9\s\-()]{6,20}$/;

export class SignupDto {
  @IsEmail() @MaxLength(120)
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email!: string;

  @IsString() @Length(8, 100)
  password!: string;

  @IsString() @Length(2, 80)
  name!: string;

  @IsString() @Length(2, 60)
  specialty!: string;

  @IsOptional() @IsString() @MaxLength(40)
  bmdcNo?: string;

  @IsOptional() @Matches(PHONE_REGEX) @MaxLength(20)
  phone?: string;

  @IsOptional() @IsString() @MaxLength(80)
  teamName?: string;
}
