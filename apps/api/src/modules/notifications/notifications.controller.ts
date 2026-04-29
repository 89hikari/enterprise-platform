import { Controller, Get, Patch, Param, Query, ParseUUIDPipe, HttpCode } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/guards/jwt-auth.guard';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  getAll(@CurrentUser() u: JwtUser, @Query('unread') unread?: string) {
    return this.notifications.getForUser(u.sub, unread === 'true');
  }

  @Get('count')
  getCount(@CurrentUser() u: JwtUser) {
    return this.notifications.getUnreadCount(u.sub).then((count) => ({ count }));
  }

  @Patch(':id/read')
  @HttpCode(204)
  markRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: JwtUser) {
    return this.notifications.markRead(id, u.sub);
  }

  @Patch('read-all')
  @HttpCode(204)
  markAllRead(@CurrentUser() u: JwtUser) {
    return this.notifications.markAllRead(u.sub);
  }
}
