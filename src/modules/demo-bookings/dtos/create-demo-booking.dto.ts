import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const PHONE_REGEX = /^\+?[0-9\s\-()]{6,20}$/;

export class CreateDemoBookingDto {
  @IsEmail() @MaxLength(120)
  email!: string;

  @IsOptional() @Matches(PHONE_REGEX) @MaxLength(20)
  phone?: string;

  @IsOptional() @IsString() @MaxLength(80)
  name?: string;

  @IsOptional() @IsString() @MaxLength(120)
  practice?: string;

  @IsOptional() @IsString() @MaxLength(60)
  specialty?: string;

  @IsOptional() @IsString() @MaxLength(120)
  preferredSlot?: string;

  @IsOptional() @IsString() @MaxLength(200)
  calendlyEventUri?: string;

  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;

  @IsOptional() @IsString() @MaxLength(60)
  clientNonce?: string;
}
