import {
  IsString,
  Length,
  MaxLength,
  Matches,
} from 'class-validator';

export class RequestOtpDto {
  @IsString() @MaxLength(24)
  phone!: string;
}

export class VerifyOtpDto {
  @IsString() @MaxLength(24)
  phone!: string;

  @IsString() @Length(6, 6) @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code!: string;
}
