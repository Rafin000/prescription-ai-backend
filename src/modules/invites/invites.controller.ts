import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, AuthedUser } from 'src/decorators/current-user.decorator';
import { Public } from 'src/decorators/public.decorator';
import { Roles } from 'src/decorators/roles.decorator';
import { ROLES } from 'src/base/base.constants';
import { InvitesService } from './invites.service';
import { AcceptInviteDto, CreateInviteDto } from './dtos/invite.dto';

@Controller()
export class InvitesController {
  constructor(private readonly svc: InvitesService) {}

  /* ── authed — /team/invites ─────────────────────────────────── */
  @Get('team/invites')
  list(@CurrentUser() u: AuthedUser) {
    return this.svc.list(u.teamId);
  }

  @Post('team/invites')
  @Roles(ROLES.OWNER)
  create(@CurrentUser() u: AuthedUser, @Body() dto: CreateInviteDto) {
    return this.svc.create(u.teamId, u.userId, dto);
  }

  @Delete('team/invites/:id')
  @HttpCode(204)
  @Roles(ROLES.OWNER)
  async revoke(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    await this.svc.revoke(u.teamId, id);
  }

  @Post('team/invites/:id/resend')
  @Roles(ROLES.OWNER)
  resend(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.svc.resend(u.teamId, id);
  }

  /* ── public — the invitee's accept flow ────────────────────── */
  @Public()
  @Get('invites/:token')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  getPublic(@Param('token') token: string) {
    return this.svc.getPublic(token);
  }

  @Public()
  @Post('invites/:token/accept')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  accept(@Param('token') token: string, @Body() dto: AcceptInviteDto) {
    // path param wins over body token
    return this.svc.accept({ ...dto, token });
  }
}
