import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class SavePreferencesDto {
  @IsOptional() @IsIn(['bn', 'en', 'bilingual'])
  rxLanguage?: 'bn' | 'en' | 'bilingual';

  @IsOptional() @IsInt() @Min(5) @Max(120)
  defaultAppointmentMinutes?: number;

  @IsOptional() @IsString() @MaxLength(500)
  rxFooter?: string;
}

export class SavePreferencesBody {
  @IsObject()
  @ValidateNested()
  @Type(() => SavePreferencesDto)
  preferences!: SavePreferencesDto;
}
