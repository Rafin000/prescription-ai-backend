import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from 'src/decorators/public.decorator';
import { DemoBookingsService } from './demo-bookings.service';
import { CreateDemoBookingDto } from './dtos/create-demo-booking.dto';

@Controller('public/demo-bookings')
export class DemoBookingsController {
  constructor(private readonly svc: DemoBookingsService) {}

  @Public()
  @Post()
  @HttpCode(201)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  create(@Body() dto: CreateDemoBookingDto) {
    return this.svc.create(dto);
  }
}
