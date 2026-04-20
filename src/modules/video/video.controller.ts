import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { IsString, Length } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { Public } from 'src/decorators/public.decorator';
import { VideoService } from './video.service';

class AnnounceDto {
  @IsString() @Length(1, 80)
  displayName!: string;
}

/**
 * Public guest-join endpoints. The `:token` path segment is the capability;
 * no auth, just a random-enough secret we mint when the tele appointment is
 * booked. Rate-limited hard to deter scanning.
 */
@Controller('join')
export class VideoController {
  constructor(private readonly svc: VideoService) {}

  @Public()
  @Get(':token')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  get(@Param('token') token: string) {
    return this.svc.guestLookup(token);
  }

  @Public()
  @Post(':token/announce')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  announce(@Param('token') token: string, @Body() dto: AnnounceDto) {
    return this.svc.announce(token, dto.displayName);
  }

  @Public()
  @Post(':token/depart')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  depart(@Param('token') token: string) {
    return this.svc.depart(token);
  }
}
