import { Module } from '@nestjs/common';
import { DemoBookingsController } from './demo-bookings.controller';
import { DemoBookingsRepository } from './demo-bookings.repository';
import { DemoBookingsService } from './demo-bookings.service';

@Module({
  controllers: [DemoBookingsController],
  providers: [DemoBookingsService, DemoBookingsRepository],
  exports: [DemoBookingsService, DemoBookingsRepository],
})
export class DemoBookingsModule {}
