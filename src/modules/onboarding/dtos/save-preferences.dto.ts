import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SavePreferencesDto {
  @IsOptional() @IsIn(['bn', 'en', 'bilingual'])
  rxLanguage?: 'bn' | 'en' | 'bilingual';

  @IsOptional() @IsInt() @Min(5) @Max(120)
  defaultAppointmentMinutes?: number;

  @IsOptional() @IsString() @MaxLength(500)
  rxFooter?: string;
}

export class SavePreferencesBody {
  preferences!: SavePreferencesDto;
}
