import { IsIn, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ConfirmRequestDto {
  @IsUUID('4')
  chamberId!: string;

  @IsISO8601()
  start!: string;

  @IsISO8601()
  end!: string;

  @IsOptional() @IsIn(['in-person', 'tele'])
  type?: 'in-person' | 'tele';

  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}

export class DeclineRequestDto {
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}
