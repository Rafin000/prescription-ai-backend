import { IsIn, IsString, MaxLength } from 'class-validator';

export class CheckoutDto {
  @IsIn(['starter', 'pro', 'clinic'])
  planId!: 'starter' | 'pro' | 'clinic';

  @IsIn(['monthly', 'yearly'])
  cycle!: 'monthly' | 'yearly';

  @IsString() @MaxLength(40)
  method!: string;
}
