import { Controller, Get, Post, Param, Body, Query, HttpCode } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/guards/jwt-auth.guard';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get('status')
  async status(@CurrentUser() u: JwtUser) {
    const record = await this.teams.isConnected(u.sub);
    return { connected: !!record, scopes: record?.scopes ?? [] };
  }

  @Get()
  getTeams(@CurrentUser() u: JwtUser) {
    return this.teams.getJoinedTeams(u.sub);
  }

  @Get(':teamId/channels')
  getChannels(@Param('teamId') teamId: string, @CurrentUser() u: JwtUser) {
    return this.teams.getChannels(u.sub, teamId);
  }

  @Get(':teamId/channels/:channelId/messages')
  getMessages(
    @Param('teamId') teamId: string,
    @Param('channelId') channelId: string,
    @Query('top') top: string | undefined,
    @CurrentUser() u: JwtUser,
  ) {
    return this.teams.getMessages(u.sub, teamId, channelId, top ? +top : 30);
  }

  @Post(':teamId/channels/:channelId/messages')
  @HttpCode(201)
  sendMessage(
    @Param('teamId') teamId: string,
    @Param('channelId') channelId: string,
    @Body() body: { content: string; isHtml?: boolean },
    @CurrentUser() u: JwtUser,
  ) {
    return this.teams.sendMessage(u.sub, teamId, channelId, body.content, body.isHtml);
  }
}
