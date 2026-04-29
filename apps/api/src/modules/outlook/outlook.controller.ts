import { Controller, Get, Post, Patch, Param, Body, Query, HttpCode } from '@nestjs/common';
import { OutlookService } from './outlook.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/guards/jwt-auth.guard';

@Controller('outlook')
export class OutlookController {
  constructor(private readonly outlook: OutlookService) {}

  @Get('status')
  async status(@CurrentUser() u: JwtUser) {
    const record = await this.outlook.isConnected(u.sub);
    return { connected: !!record, scopes: record?.scopes ?? [] };
  }

  @Get('messages')
  getMessages(
    @CurrentUser() u: JwtUser,
    @Query('folder') folder?: string,
    @Query('skip') skip?: string,
    @Query('top') top?: string,
  ) {
    return this.outlook.getMessages(u.sub, folder ?? 'inbox', skip ? +skip : 0, top ? +top : 20);
  }

  @Get('messages/:id')
  getMessage(@Param('id') id: string, @CurrentUser() u: JwtUser) {
    return this.outlook.getMessage(u.sub, id);
  }

  @Post('send')
  @HttpCode(204)
  send(
    @Body() body: { to: string[]; subject: string; body: string; isHtml?: boolean; cc?: string[] },
    @CurrentUser() u: JwtUser,
  ) {
    return this.outlook.sendMail(u.sub, body.to, body.subject, body.body, body.isHtml, body.cc);
  }

  @Patch('messages/:id/read')
  @HttpCode(204)
  markRead(@Param('id') id: string, @CurrentUser() u: JwtUser) {
    return this.outlook.markRead(u.sub, id);
  }
}
