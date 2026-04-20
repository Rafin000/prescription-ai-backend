import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser, AuthedUser } from 'src/decorators/current-user.decorator';
import { VisitsService } from './visits.service';
import {
  CreateVisitDto,
  FinalizeDraftDto,
  UpdateDraftDto,
} from './dtos/create-visit.dto';

@Controller('visits')
export class VisitsController {
  constructor(private readonly svc: VisitsService) {}

  @Get()
  listAll(@CurrentUser() u: AuthedUser) {
    return this.svc.listAll(u.teamId, u.userId);
  }

  @Post()
  @HttpCode(201)
  create(@CurrentUser() u: AuthedUser, @Body() dto: CreateVisitDto) {
    return this.svc.create(u.teamId, u.userId, dto);
  }

  @Post(':id/finalize')
  @HttpCode(200)
  finalise(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: FinalizeDraftDto,
  ) {
    return this.svc.finalise(u.teamId, u.userId, id, dto);
  }

  @Patch(':id/draft')
  updateDraft(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateDraftDto,
  ) {
    return this.svc.updateDraft(u.teamId, u.userId, id, dto);
  }
}
