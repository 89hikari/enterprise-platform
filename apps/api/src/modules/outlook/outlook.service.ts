import { Injectable } from '@nestjs/common';
import { MicrosoftService } from '../microsoft/microsoft.service';

export interface MailMessage {
  id: string;
  subject: string | null;
  bodyPreview: string;
  receivedDateTime: string;
  isRead: boolean;
  from: { emailAddress: { name: string; address: string } };
  toRecipients: { emailAddress: { name: string; address: string } }[];
  body?: { contentType: string; content: string };
  hasAttachments: boolean;
  webLink: string;
}

@Injectable()
export class OutlookService {
  constructor(private microsoft: MicrosoftService) {}

  isConnected(userId: string) {
    return this.microsoft.isConnected(userId);
  }

  async getMessages(
    userId: string,
    folder = 'inbox',
    skip = 0,
    top = 20,
  ): Promise<{ value: MailMessage[]; '@odata.nextLink'?: string }> {
    return this.microsoft.graphGet(userId, `/me/mailFolders/${folder}/messages`, {
      $select: 'id,subject,bodyPreview,receivedDateTime,isRead,from,toRecipients,hasAttachments,webLink',
      $orderby: 'receivedDateTime desc',
      $top: String(top),
      $skip: String(skip),
    });
  }

  async getMessage(userId: string, messageId: string): Promise<MailMessage> {
    return this.microsoft.graphGet(userId, `/me/messages/${messageId}`, {
      $select: 'id,subject,body,receivedDateTime,isRead,from,toRecipients,ccRecipients,hasAttachments,webLink',
    });
  }

  async sendMail(
    userId: string,
    to: string[],
    subject: string,
    body: string,
    isHtml = false,
    cc?: string[],
  ): Promise<void> {
    await this.microsoft.graphPost(userId, '/me/sendMail', {
      message: {
        subject,
        body: { contentType: isHtml ? 'HTML' : 'Text', content: body },
        toRecipients: to.map((address) => ({ emailAddress: { address } })),
        ccRecipients: (cc ?? []).map((address) => ({ emailAddress: { address } })),
      },
      saveToSentItems: true,
    });
  }

  async markRead(userId: string, messageId: string): Promise<void> {
    await this.microsoft.graphPost(userId, `/me/messages/${messageId}/markAsRead`, {});
  }
}
