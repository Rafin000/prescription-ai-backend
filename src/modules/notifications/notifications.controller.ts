import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, AuthedUser } from 'src/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  async list(
    @CurrentUser() u: AuthedUser,
    @Query('unread') unread?: string,
  ) {
    const unreadOnly = unread === 'true';
    const [items, unreadCount] = await Promise.all([
      this.svc.list(u.teamId, u.userId, unreadOnly),
      this.svc.unreadCount(u.teamId, u.userId),
    ]);
    return { items, unreadCount };
  }

  @Post(':id/read')
  @HttpCode(204)
  async markRead(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    await this.svc.markRead(u.teamId, u.userId, id);
  }

  @Post('read-all')
  @HttpCode(204)
  async markAllRead(@CurrentUser() u: AuthedUser) {
    await this.svc.markAllRead(u.teamId, u.userId);
  }
}
