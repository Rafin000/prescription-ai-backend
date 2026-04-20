import { Injectable } from '@nestjs/common';
import { DemoBookingsRepository } from './demo-bookings.repository';
import { CreateDemoBookingDto } from './dtos/create-demo-booking.dto';

@Injectable()
export class DemoBookingsService {
  constructor(private readonly repo: DemoBookingsRepository) {}

  create(dto: CreateDemoBookingDto) {
    return this.repo.create(dto);
  }
}
