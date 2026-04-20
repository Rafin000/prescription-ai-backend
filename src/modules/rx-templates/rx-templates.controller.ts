import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser, AuthedUser } from 'src/decorators/current-user.decorator';
import { RxTemplatesService } from './rx-templates.service';
import { UpsertRxTemplateDto } from './dtos/rx-template.dto';

@Controller('templates')
export class RxTemplatesController {
  constructor(private readonly svc: RxTemplatesService) {}

  @Get()
  list(@CurrentUser() u: AuthedUser) {
    return this.svc.list(u.teamId, u.userId);
  }

  @Post()
  @HttpCode(201)
  create(@CurrentUser() u: AuthedUser, @Body() dto: UpsertRxTemplateDto) {
    return this.svc.create(u.teamId, u.userId, u.role, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpsertRxTemplateDto,
  ) {
    return this.svc.update(u.teamId, u.userId, u.role, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    await this.svc.remove(u.teamId, u.userId, u.role, id);
  }

  @Post(':id/use')
  @HttpCode(200)
  use(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.svc.use(u.teamId, id);
  }
}
