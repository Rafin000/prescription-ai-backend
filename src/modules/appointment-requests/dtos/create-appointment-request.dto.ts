import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

const PHONE_REGEX = /^\+?[0-9\s\-()]{6,20}$/;

export class CreateAppointmentRequestDto {
  @IsUUID('4')
  doctorId!: string;

  @IsOptional() @IsUUID('4')
  chamberId?: string;

  @IsString() @Length(2, 80)
  patientName!: string;

  @IsString() @Matches(PHONE_REGEX, { message: 'phone must be a valid number' }) @MaxLength(20)
  phone!: string;

  @IsOptional() @IsString() @MaxLength(500)
  symptoms?: string;

  @IsOptional() @IsString() @MaxLength(60)
  preferredTime?: string;

  @IsOptional() @IsIn(['in-person', 'video'])
  mode?: 'in-person' | 'video';

  @IsOptional() @IsString() @MaxLength(60)
  source?: string;

  /** Client-generated nonce so rapid double-submits collapse to one row. */
  @IsOptional() @IsString() @MaxLength(60)
  clientNonce?: string;
}
