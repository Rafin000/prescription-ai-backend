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
  Query,
} from '@nestjs/common';
import { CurrentUser, AuthedUser } from 'src/decorators/current-user.decorator';
import { LabIntakesService } from './lab-intakes.service';
import {
  AssignLabIntakeDto,
  UploadLabIntakeDto,
} from './dtos/lab-intake.dto';

@Controller('lab-intake')
export class LabIntakesController {
  constructor(private readonly svc: LabIntakesService) {}

  @Get()
  list(@CurrentUser() u: AuthedUser, @Query('status') status?: string) {
    return this.svc.list(u.teamId, status);
  }

  @Post()
  @HttpCode(201)
  upload(@CurrentUser() u: AuthedUser, @Body() dto: UploadLabIntakeDto) {
    return this.svc.upload(u.teamId, u.userId, dto);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  confirm(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.svc.confirm(u.teamId, id);
  }

  @Patch(':id/assign')
  assign(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AssignLabIntakeDto,
  ) {
    return this.svc.assign(u.teamId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async reject(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    await this.svc.archive(u.teamId, id);
  }
}
