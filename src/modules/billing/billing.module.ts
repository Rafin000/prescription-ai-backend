import { Module } from '@nestjs/common';
import { DoctorsModule } from 'src/modules/doctors/doctors.module';
import { SslCommerzModule } from 'src/integrations/sslcommerz/sslcommerz.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { UsageModule } from 'src/modules/usage/usage.module';

@Module({
  imports: [DoctorsModule, SslCommerzModule, UsageModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
