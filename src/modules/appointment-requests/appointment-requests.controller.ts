import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from 'src/decorators/public.decorator';
import { CurrentUser, AuthedUser } from 'src/decorators/current-user.decorator';
import { AppointmentRequestsService } from './appointment-requests.service';
import { CreateAppointmentRequestDto } from './dtos/create-appointment-request.dto';
import {
  ConfirmRequestDto,
  DeclineRequestDto,
} from './dtos/confirm-request.dto';

@Controller()
export class AppointmentRequestsController {
  constructor(private readonly svc: AppointmentRequestsService) {}

  /* Public — called by the landing form. */
  @Public()
  @Post('public/appointment-requests')
  @HttpCode(201)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  create(@Body() dto: CreateAppointmentRequestDto) {
    return this.svc.create(dto);
  }

  /* Authed — dashboard inbox. */
  @Get('appointment-requests')
  list(@CurrentUser() u: AuthedUser, @Query('status') status?: string) {
    return this.svc.listForDoctor(u.teamId, u.userId, status);
  }

  @Post('appointment-requests/:id/confirm')
  @HttpCode(200)
  confirm(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ConfirmRequestDto,
  ) {
    return this.svc.confirm(u.teamId, u.userId, id, dto);
  }

  @Post('appointment-requests/:id/decline')
  @HttpCode(200)
  decline(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: DeclineRequestDto,
  ) {
    return this.svc.decline(u.teamId, u.userId, id, dto);
  }
}
