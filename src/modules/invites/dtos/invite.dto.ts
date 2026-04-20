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

export class CreateInviteDto {
  @IsEmail() @MaxLength(120)
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email!: string;

  @IsString() @Length(2, 60)
  role!: string;

  @IsOptional() @IsString() @MaxLength(500)
  message?: string;
}

export class AcceptInviteDto {
  @IsString() @MaxLength(200)
  token!: string;

  @IsString() @Length(2, 80)
  name!: string;

  @IsString() @Length(8, 100)
  password!: string;

  @IsOptional() @IsString() @Matches(PHONE_REGEX) @MaxLength(20)
  phone?: string;
}
