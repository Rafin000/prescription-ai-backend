import { Global, Module } from '@nestjs/common';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';

@Global()
@Module({
  controllers: [OtpController],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
