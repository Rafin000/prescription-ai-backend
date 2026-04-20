import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class InitiateCheckoutDto {
  @IsIn(['starter', 'pro', 'clinic'])
  planId!: 'starter' | 'pro' | 'clinic';

  @IsIn(['monthly', 'yearly'])
  cycle!: 'monthly' | 'yearly';

  @IsUrl({ require_tld: false }) @MaxLength(400)
  successUrl!: string;

  @IsUrl({ require_tld: false }) @MaxLength(400)
  failUrl!: string;

  @IsUrl({ require_tld: false }) @MaxLength(400)
  cancelUrl!: string;
}

export class VerifyCheckoutDto {
  @IsString() @MaxLength(120)
  tranId!: string;
}

export class ChangePlanDto extends InitiateCheckoutDto {}

export class IpnDto {
  @IsOptional() @IsString() @MaxLength(120) tran_id?: string;
  @IsOptional() @IsString() @MaxLength(40)  status?: string;
  @IsOptional() @IsString() @MaxLength(40)  val_id?: string;
}
