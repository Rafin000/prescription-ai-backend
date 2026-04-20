import { IsIn } from 'class-validator';

export class SkipStepDto {
  @IsIn(['preferences', 'team'])
  step!: 'preferences' | 'team';
}
