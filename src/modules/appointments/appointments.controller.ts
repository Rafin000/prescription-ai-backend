import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { IsBoolean, IsIn } from 'class-validator';
import { CurrentUser, AuthedUser } from 'src/decorators/current-user.decorator';
import { AppointmentsService } from './appointments.service';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
} from './dtos/create-appointment.dto';

class PresenceDto {
  @IsIn(['doctor', 'patient'])
  actor!: 'doctor' | 'patient';

  @IsBoolean()
  present!: boolean;
}

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly svc: AppointmentsService) {}

  @Get()
  list(
    @CurrentUser() u: AuthedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.list(u.teamId, u.userId, from, to);
  }

  @Get(':id')
  get(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.svc.get(u.teamId, id);
  }

  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() u: AuthedUser,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.svc.create(u.teamId, u.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.svc.update(u.teamId, id, dto);
  }

  @Post(':id/promote')
  @HttpCode(200)
  promoteDraft(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.svc.promoteDraft(u.teamId, u.userId, id);
  }

  @Post(':id/presence')
  @HttpCode(200)
  presence(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: PresenceDto,
  ) {
    return this.svc.setPresence(u.teamId, id, dto.actor, dto.present);
  }
}
