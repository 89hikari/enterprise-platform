import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect,
  ConnectedSocket, MessageBody, WsException,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { ChessService } from './chess.service';
import type { JwtUser } from '../../common/guards/jwt-auth.guard';

interface AuthSocket extends Socket {
  user: JwtUser;
}

const DISCONNECT_GRACE_MS = 30_000;

@WebSocketGateway({ namespace: '/chess', cors: { origin: '*' } })
export class ChessGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private logger = new Logger(ChessGateway.name);
  private jwks: jwksClient.JwksClient;
  private disconnectTimers = new Map<string, NodeJS.Timeout>();
  private activeSockets = new Map<string, Set<string>>();

  constructor(
    private chess: ChessService,
    private config: ConfigService,
  ) {
    this.jwks = jwksClient.default({
      jwksUri: this.config.get<string>('app.keycloak.jwksUri')!,
      cache: true,
      cacheMaxAge: 600_000,
    });
  }

  async handleConnection(client: AuthSocket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) { client.disconnect(); return; }
    try {
      client.user = await this.verifyToken(token);
      this.logger.debug(`Chess connect: ${client.user.sub}`);

      const userId = client.user.sub;
      if (!this.activeSockets.has(userId)) {
        this.activeSockets.set(userId, new Set());
      }
      this.activeSockets.get(userId)!.add(client.id);

      const existingTimer = this.disconnectTimers.get(userId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        this.disconnectTimers.delete(userId);
        this.logger.debug(`Cleared disconnect timer for ${userId}`);
      }
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthSocket) {
    const userId = client.user?.sub;
    if (!userId) return;
    this.logger.debug(`Chess disconnect: ${userId}`);

    const sockets = this.activeSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.activeSockets.delete(userId);
      }
    }

    if (this.activeSockets.has(userId) && this.activeSockets.get(userId)!.size > 0) {
      this.logger.debug(`User ${userId} still has active sockets, skipping disconnect timer`);
      return;
    }

    const game = this.chess.getActiveGameForUser(userId);
    if (!game) return;

    this.server.to(game.roomId).emit('opponent_disconnected', { gracePeriodMs: DISCONNECT_GRACE_MS });

    const existingTimer = this.disconnectTimers.get(userId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      this.disconnectTimers.delete(userId);
      const result = game.whiteId === userId ? 'BLACK_WIN' : 'WHITE_WIN';
      try {
        const gameOver = await this.chess.endGame(game.roomId, result as any, 'DISCONNECT');
        this.server.to(game.roomId).emit('game_over', gameOver);
        const rooms = await this.chess.getRooms();
        this.server.emit('room_list', rooms);
      } catch (e) {
        this.logger.error('Error ending game on disconnect', e);
      }
    }, DISCONNECT_GRACE_MS);

    this.disconnectTimers.set(userId, timer);
  }

  @SubscribeMessage('create_room')
  async handleCreateRoom(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { name: string; timeControl?: number | null },
  ) {
    try {
      const room = await this.chess.createRoom(
        payload.name,
        payload.timeControl ?? null,
        client.user.sub,
      );
      await client.join(room.id);
      const rooms = await this.chess.getRooms();
      this.server.emit('room_list', rooms);
      return { event: 'room_created', room };
    } catch (e: any) {
      throw new WsException(e.message ?? 'Failed to create room');
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomId: string },
  ) {
    const { roomId } = payload;
    const userId = client.user.sub;

    const existingTimer = this.disconnectTimers.get(userId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.disconnectTimers.delete(userId);
      await client.join(roomId);
      const gamePayload = await this.chess.getGameStartedPayload(roomId);
      if (gamePayload) {
        client.emit('game_started', gamePayload);
        this.server.to(roomId).emit('opponent_reconnected');
      }
      return;
    }

    const existingGame = this.chess.getActiveGame(roomId);
    if (existingGame && (existingGame.whiteId === userId || existingGame.blackId === userId)) {
      await client.join(roomId);
      const gamePayload = await this.chess.getGameStartedPayload(roomId);
      if (gamePayload) client.emit('game_started', gamePayload);
      return;
    }

    try {
      const gamePayload = await this.chess.startGame(roomId, userId);
      await client.join(roomId);
      this.server.to(roomId).emit('game_started', gamePayload);
      const rooms = await this.chess.getRooms();
      this.server.emit('room_list', rooms);
    } catch (e: any) {
      throw new WsException(e.message ?? 'Cannot join room');
    }
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomId: string },
  ) {
    try {
      await this.chess.cancelRoom(payload.roomId, client.user.sub);
      client.leave(payload.roomId);
      const rooms = await this.chess.getRooms();
      this.server.emit('room_list', rooms);
    } catch (e: any) {
      throw new WsException(e.message ?? 'Cannot cancel room');
    }
  }

  @SubscribeMessage('make_move')
  async handleMakeMove(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomId: string; from: string; to: string; promotion?: string },
  ) {
    const result = this.chess.makeMove(
      payload.roomId,
      client.user.sub,
      payload.from,
      payload.to,
      payload.promotion,
    );

    if (result.status === 'illegal') {
      client.emit('invalid_move', { reason: result.reason });
      return;
    }

    if (result.status === 'timeout') {
      try {
        const gameOver = await this.chess.endGame(payload.roomId, result.result, 'TIMEOUT');
        this.server.to(payload.roomId).emit('game_over', gameOver);
        const rooms = await this.chess.getRooms();
        this.server.emit('room_list', rooms);
      } catch (e) {
        this.logger.error('Error ending game on timeout', e);
      }
      return;
    }

    this.server.to(payload.roomId).emit('move_made', result.payload);

    if (result.gameOver) {
      try {
        const gameOver = await this.chess.endGame(payload.roomId, result.gameOver.result, result.gameOver.reason);
        this.server.to(payload.roomId).emit('game_over', gameOver);
        const rooms = await this.chess.getRooms();
        this.server.emit('room_list', rooms);
      } catch (e) {
        this.logger.error('Error ending game', e);
      }
    }
  }

  @SubscribeMessage('offer_draw')
  handleOfferDraw(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomId: string },
  ) {
    const game = this.chess.getActiveGame(payload.roomId);
    if (!game) throw new WsException('Game not found');
    if (game.whiteId !== client.user.sub && game.blackId !== client.user.sub) {
      throw new WsException('Not a player in this game');
    }
    client.to(payload.roomId).emit('draw_offered', { by: client.user.sub });
  }

  @SubscribeMessage('respond_draw')
  async handleRespondDraw(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomId: string; accept: boolean },
  ) {
    if (!payload.accept) {
      client.to(payload.roomId).emit('draw_declined');
      return;
    }
    try {
      const gameOver = await this.chess.endGame(payload.roomId, 'DRAW', 'DRAW_AGREEMENT');
      this.server.to(payload.roomId).emit('game_over', gameOver);
      const rooms = await this.chess.getRooms();
      this.server.emit('room_list', rooms);
    } catch (e: any) {
      throw new WsException(e.message ?? 'Failed to end game');
    }
  }

  @SubscribeMessage('resign')
  async handleResign(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomId: string },
  ) {
    const game = this.chess.getActiveGame(payload.roomId);
    if (!game) throw new WsException('Game not found');
    const result = game.whiteId === client.user.sub ? 'BLACK_WIN' : 'WHITE_WIN';
    try {
      const gameOver = await this.chess.endGame(payload.roomId, result as any, 'RESIGN');
      this.server.to(payload.roomId).emit('game_over', gameOver);
      const rooms = await this.chess.getRooms();
      this.server.emit('room_list', rooms);
    } catch (e: any) {
      throw new WsException(e.message ?? 'Failed to resign');
    }
  }

  private verifyToken(token: string): Promise<JwtUser> {
    return new Promise((resolve, reject) => {
      const getKey: jwt.GetPublicKeyOrSecret = (header, callback) => {
        this.jwks.getSigningKey(header.kid, (err, key) => {
          if (err) return callback(err);
          callback(null, key?.getPublicKey());
        });
      };
      jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
        if (err) return reject(err);
        const p = decoded as jwt.JwtPayload & { roles?: string[]; preferred_username?: string };
        resolve({ sub: p.sub ?? '', email: p.email ?? '', roles: (p.roles ?? []) as any, preferred_username: p.preferred_username ?? '' });
      });
    });
  }
}
