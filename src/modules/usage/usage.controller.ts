import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser, AuthedUser } from 'src/decorators/current-user.decorator';
import { UsageKind } from './usage.repository';
import { UsageService } from './usage.service';

@Controller('usage')
export class UsageController {
  constructor(private readonly svc: UsageService) {}

  @Get('summary')
  summary(@CurrentUser() u: AuthedUser) {
    return this.svc.summary(u.teamId);
  }

  @Get('events')
  events(
    @CurrentUser() u: AuthedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('kind') kind?: UsageKind,
    @Query('limit') limit?: string,
  ) {
    return this.svc.list(u.teamId, {
      from,
      to,
      kind,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
