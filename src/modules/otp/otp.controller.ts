import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from 'src/decorators/public.decorator';
import { OtpService } from './otp.service';
import { RequestOtpDto, VerifyOtpDto } from './dtos/otp.dto';

@Controller('auth/otp')
export class OtpController {
  constructor(private readonly svc: OtpService) {}

  @Public()
  @Post('request')
  @HttpCode(200)
  // Coarse per-IP limit alongside the per-phone Redis window in the service.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  request(@Body() dto: RequestOtpDto) {
    return this.svc.request(dto.phone);
  }

  @Public()
  @Post('verify')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  verify(@Body() dto: VerifyOtpDto) {
    return this.svc.verify(dto.phone, dto.code);
  }
}
