import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import type { UserRole } from '@enterprise/shared';
import type { JwtUser } from '../../common/guards/jwt-auth.guard';

interface AuthSocket extends Socket {
  user: JwtUser;
}

@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private logger = new Logger(ChatGateway.name);
  private jwks: jwksClient.JwksClient;

  constructor(
    private chat: ChatService,
    private config: ConfigService,
  ) {
    this.jwks = jwksClient.default({
      jwksUri: this.config.get<string>('app.keycloak.jwksUri')!,
      cache: true,
      cacheMaxAge: 600000,
    });
  }

  // ── Auth handshake ─────────────────────────────────────────────────────────

  async handleConnection(client: AuthSocket) {
    const token: string | undefined = client.handshake.auth?.token;
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const user = await this.verifyToken(token);
      client.user = user;
      this.logger.debug(`Connected: ${user.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthSocket) {
    this.logger.debug(`Disconnected: ${client.user?.sub ?? 'unknown'}`);
  }

  // ── Room events ────────────────────────────────────────────────────────────

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomId: string },
  ) {
    if (!client.user) throw new WsException('Not authenticated');
    try {
      await this.chat.getRoom(payload.roomId, client.user.sub);
      await client.join(payload.roomId);
      return { event: 'joined', roomId: payload.roomId };
    } catch {
      throw new WsException('Cannot join room');
    }
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomId: string },
  ) {
    client.leave(payload.roomId);
    return { event: 'left', roomId: payload.roomId };
  }

  // ── Messaging ──────────────────────────────────────────────────────────────

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomId: string } & SendMessageDto,
  ) {
    if (!client.user) throw new WsException('Not authenticated');
    try {
      const { roomId, ...dto } = payload;
      const message = await this.chat.saveMessage(roomId, client.user.sub, dto);
      // Broadcast to everyone in the room (including sender for multi-device sync)
      this.server.to(roomId).emit('message_received', message);
      return message;
    } catch (e: any) {
      throw new WsException(e.message ?? 'Failed to send message');
    }
  }

  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { messageId: string; roomId: string },
  ) {
    if (!client.user) throw new WsException('Not authenticated');
    const result = await this.chat.deleteMessage(payload.messageId, client.user.sub);
    this.server.to(payload.roomId).emit('message_deleted', { messageId: payload.messageId });
    return result;
  }

  // ── Typing indicators ──────────────────────────────────────────────────────

  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomId: string },
  ) {
    if (!client.user) throw new WsException('Not authenticated');
    client.to(payload.roomId).emit('user_typing', {
      roomId: payload.roomId,
      userId: client.user.sub,
    });
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomId: string },
  ) {
    if (!client.user) throw new WsException('Not authenticated');
    client.to(payload.roomId).emit('user_stopped_typing', {
      roomId: payload.roomId,
      userId: client.user.sub,
    });
  }

  // ── Read receipts ──────────────────────────────────────────────────────────

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomId: string },
  ) {
    if (!client.user) throw new WsException('Not authenticated');
    await this.chat.markRead(payload.roomId, client.user.sub);
    client.to(payload.roomId).emit('room_read', {
      roomId: payload.roomId,
      userId: client.user.sub,
    });
  }

  // ── Emitter used by other services ────────────────────────────────────────

  emitToRoom(roomId: string, event: string, data: unknown) {
    this.server.to(roomId).emit(event, data);
  }

  // ── JWT helper ─────────────────────────────────────────────────────────────

  private verifyToken(token: string): Promise<JwtUser> {
    return new Promise((resolve, reject) => {
      const getKey: jwt.GetPublicKeyOrSecret = (
        header: jwt.JwtHeader,
        callback: jwt.SigningKeyCallback,
      ) => {
        this.jwks.getSigningKey(header.kid, (err: Error | null, key) => {
          if (err) return callback(err);
          callback(null, key?.getPublicKey());
        });
      };

      jwt.verify(
        token,
        getKey,
        { algorithms: ['RS256'] },
        (err: jwt.VerifyErrors | null, decoded: jwt.JwtPayload | string | undefined) => {
          if (err) return reject(err);
          const p = decoded as jwt.JwtPayload & { roles?: string[]; preferred_username?: string };
          resolve({
            sub: p.sub ?? '',
            email: p.email ?? '',
            roles: (p.roles ?? []) as UserRole[],
            preferred_username: p.preferred_username ?? '',
          });
        },
      );
    });
  }
}
