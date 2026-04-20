import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser, AuthedUser } from 'src/decorators/current-user.decorator';
import { Roles } from 'src/decorators/roles.decorator';
import { ROLES } from 'src/base/base.constants';
import { AuditRepository } from './audit.repository';

@Controller('audit')
export class AuditController {
  constructor(private readonly repo: AuditRepository) {}

  @Get()
  @Roles(ROLES.OWNER)
  list(@CurrentUser() u: AuthedUser, @Query('limit') limit?: string) {
    return this.repo.listForTeam(u.teamId, limit ? Number(limit) : 100);
  }
}
