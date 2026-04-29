import {
  WebSocketGateway, WebSocketServer,
  OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';

@WebSocketGateway({ namespace: '/notifications', cors: { origin: '*' } })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  // userId → Set of socket IDs
  private userSockets = new Map<string, Set<string>>();

  private jwksClient = jwksRsa({
    jwksUri: process.env.JWT_PUBLIC_KEY_URL ?? 'http://keycloak:8080/realms/enterprise/protocol/openid-connect/certs',
    cache: true,
    rateLimit: true,
  });

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) { client.disconnect(); return; }

    try {
      const sub = await this.verifyToken(token);
      client.data.userId = sub;
      if (!this.userSockets.has(sub)) this.userSockets.set(sub, new Set());
      this.userSockets.get(sub)!.add(client.id);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const sub = client.data.userId as string | undefined;
    if (sub) {
      this.userSockets.get(sub)?.delete(client.id);
      if (this.userSockets.get(sub)?.size === 0) this.userSockets.delete(sub);
    }
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    const socketIds = this.userSockets.get(userId);
    if (!socketIds?.size) return;
    for (const id of socketIds) {
      this.server.to(id).emit(event, payload);
    }
  }

  private verifyToken(token: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const getKey: jwt.GetPublicKeyOrSecret = (header, callback) => {
        this.jwksClient.getSigningKey(header.kid, (err: Error | null, key: jwksRsa.SigningKey | undefined) => {
          if (err) return callback(err);
          callback(null, key?.getPublicKey());
        });
      };
      jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
        if (err || !decoded || typeof decoded === 'string') return reject(err);
        resolve((decoded as jwt.JwtPayload).sub ?? '');
      });
    });
  }
}
