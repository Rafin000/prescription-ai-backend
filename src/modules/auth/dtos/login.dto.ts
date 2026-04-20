import { Transform } from 'class-transformer';
import { IsString, Length, MaxLength } from 'class-validator';

export class LoginDto {
  /** Email for now; we'll accept phone too once auth/phone-otp lands. */
  @IsString() @MaxLength(120)
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  identifier!: string;

  @IsString() @Length(6, 200)
  password!: string;
}
