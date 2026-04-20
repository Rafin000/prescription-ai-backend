import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { CurrentUser, AuthedUser } from 'src/decorators/current-user.decorator';
import { PrescriptionsService } from './prescriptions.service';

@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly svc: PrescriptionsService) {}

  @Get(':id')
  get(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.svc.get(u.teamId, id);
  }
}
