import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

export class EnvSchema {
  @IsIn(['development', 'test', 'staging', 'production'])
  NODE_ENV!: 'development' | 'test' | 'staging' | 'production';

  @IsNumberString()
  PORT!: string;

  @IsString()
  CORS_ORIGINS!: string;

  @IsString()
  DATABASE_URL!: string;

  @IsOptional()
  @IsString()
  DATABASE_DIRECT_URL?: string;

  @IsString()
  REDIS_URL!: string;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  JWT_EXPIRES_IN!: string;

  @IsOptional()
  @IsString()
  COOKIE_DOMAIN?: string;

  @IsOptional()
  @IsBooleanString()
  COOKIE_SECURE?: string;

  @IsOptional() @IsString() SSLCOMMERZ_STORE_ID?: string;
  @IsOptional() @IsString() SSLCOMMERZ_STORE_PASSWD?: string;
  @IsOptional() @IsBooleanString() SSLCOMMERZ_SANDBOX?: string;

  @IsOptional() @IsString() SMS_PROVIDER?: string;
  @IsOptional() @IsString() SMS_API_KEY?: string;
  @IsOptional() @IsString() RESEND_API_KEY?: string;

  @IsOptional() @IsString() S3_REGION?: string;
  @IsOptional() @IsString() S3_BUCKET?: string;
  @IsOptional() @IsString() AWS_ACCESS_KEY_ID?: string;
  @IsOptional() @IsString() AWS_SECRET_ACCESS_KEY?: string;

  @IsOptional() @IsString() ANTHROPIC_API_KEY?: string;
  @IsOptional() @IsString() OPENAI_API_KEY?: string;
  @IsOptional() @IsString() DEEPGRAM_API_KEY?: string;

  @IsOptional() @IsString() SENTRY_DSN?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvSchema {
  const parsed = plainToInstance(EnvSchema, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(parsed, {
    skipMissingProperties: false,
    whitelist: true,
    forbidNonWhitelisted: false,
  });
  if (errors.length > 0) {
    throw new Error(
      `Invalid environment config:\n${errors
        .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
        .join('\n')}`,
    );
  }
  return parsed;
}
