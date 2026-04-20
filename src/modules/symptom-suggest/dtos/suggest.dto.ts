import { IsString, MaxLength, MinLength } from 'class-validator';

export class SuggestDto {
  @IsString() @MinLength(2) @MaxLength(500)
  symptoms!: string;
}
