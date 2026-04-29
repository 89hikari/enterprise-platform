import { Injectable } from '@nestjs/common';
import { MicrosoftService } from '../microsoft/microsoft.service';

export interface Team {
  id: string;
  displayName: string;
  description: string | null;
  webUrl?: string;
}

export interface Channel {
  id: string;
  displayName: string;
  description: string | null;
  membershipType: string;
  webUrl?: string;
}

export interface TeamMessage {
  id: string;
  messageType: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  from: { user?: { displayName: string; id: string } } | null;
  body: { contentType: string; content: string };
  webUrl: string | null;
  reactions?: { reactionType: string; count: number }[];
}

@Injectable()
export class TeamsService {
  constructor(private microsoft: MicrosoftService) {}

  isConnected(userId: string) {
    return this.microsoft.isConnected(userId);
  }

  async getJoinedTeams(userId: string): Promise<Team[]> {
    const res = await this.microsoft.graphGet<{ value: Team[] }>(userId, '/me/joinedTeams', {
      $select: 'id,displayName,description,webUrl',
    });
    return res.value;
  }

  async getChannels(userId: string, teamId: string): Promise<Channel[]> {
    const res = await this.microsoft.graphGet<{ value: Channel[] }>(userId, `/teams/${teamId}/channels`, {
      $select: 'id,displayName,description,membershipType,webUrl',
    });
    return res.value;
  }

  async getMessages(
    userId: string,
    teamId: string,
    channelId: string,
    top = 30,
  ): Promise<{ value: TeamMessage[]; '@odata.nextLink'?: string }> {
    return this.microsoft.graphGet(userId, `/teams/${teamId}/channels/${channelId}/messages`, {
      $top: String(top),
      $orderby: 'createdDateTime desc',
    });
  }

  async sendMessage(
    userId: string,
    teamId: string,
    channelId: string,
    content: string,
    isHtml = false,
  ): Promise<TeamMessage> {
    return this.microsoft.graphPost(userId, `/teams/${teamId}/channels/${channelId}/messages`, {
      body: { contentType: isHtml ? 'html' : 'text', content },
    });
  }
}
