import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Chess } from 'chess.js';
import { PrismaService } from '../../prisma/prisma.service';
import { calculateElo, deductClock } from './chess.utils';
import type { ChessRoomSummary, ChessPlayerRank, ChessGameStartedPayload, ChessMoveMadePayload, ChessGameOverPayload, ChessResult, ChessEndReason } from '@enterprise/shared';

export interface ActiveGame {
  roomId: string;
  chess: Chess;
  whiteId: string;
  blackId: string;
  whiteTimeMs: number;
  blackTimeMs: number;
  lastMoveAt: number;
  turn: 'w' | 'b';
}

const USER_SELECT = { id: true, firstName: true, lastName: true, photoUrl: true } as const;

@Injectable()
export class ChessService {
  private games = new Map<string, ActiveGame>();

  constructor(private prisma: PrismaService) {}

  // ── Room list & leaderboard (REST) ────────────────────────────────────────

  async getRooms(): Promise<ChessRoomSummary[]> {
    const rooms = await this.prisma.chessRoom.findMany({
      where: { status: { in: ['WAITING', 'ACTIVE'] } },
      include: {
        creator: { select: USER_SELECT },
        white: { select: USER_SELECT },
        black: { select: USER_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rooms.map((r) => ({
      id: r.id,
      name: r.name,
      creator: r.creator,
      status: r.status as ChessRoomSummary['status'],
      timeControl: r.timeControl,
      white: r.white,
      black: r.black,
    }));
  }

  async getLeaderboard(): Promise<ChessPlayerRank[]> {
    const players = await this.prisma.chessPlayer.findMany({
      orderBy: { elo: 'desc' },
      take: 50,
      include: { user: { select: USER_SELECT } },
    });
    return players.map((p, i) => ({
      rank: i + 1,
      userId: p.userId,
      firstName: p.user.firstName,
      lastName: p.user.lastName,
      photoUrl: p.user.photoUrl,
      elo: p.elo,
      wins: p.wins,
      losses: p.losses,
      draws: p.draws,
      gamesPlayed: p.gamesPlayed,
    }));
  }

  // ── Room management ────────────────────────────────────────────────────────

  async createRoom(name: string, timeControl: number | null, creatorId: string): Promise<ChessRoomSummary> {
    const room = await this.prisma.chessRoom.create({
      data: { name, timeControl, creatorId, whiteId: creatorId },
      include: {
        creator: { select: USER_SELECT },
        white: { select: USER_SELECT },
        black: { select: USER_SELECT },
      },
    });
    return {
      id: room.id,
      name: room.name,
      creator: room.creator,
      status: 'WAITING',
      timeControl: room.timeControl,
      white: room.white,
      black: room.black,
    };
  }

  async cancelRoom(roomId: string, userId: string): Promise<void> {
    const room = await this.prisma.chessRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.creatorId !== userId) throw new ForbiddenException('Only creator can cancel');
    if (room.status !== 'WAITING') throw new BadRequestException('Cannot cancel active game');
    await this.prisma.chessRoom.delete({ where: { id: roomId } });
  }

  // ── Game lifecycle ────────────────────────────────────────────────────────

  async startGame(roomId: string, blackId: string): Promise<ChessGameStartedPayload> {
    const room = await this.prisma.chessRoom.findUnique({
      where: { id: roomId },
      include: {
        white: { select: USER_SELECT },
      },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (room.status !== 'WAITING') throw new BadRequestException('Room is not waiting for a player');
    if (room.whiteId === blackId) throw new BadRequestException('Cannot play against yourself');

    const blackUser = await this.prisma.user.findUnique({
      where: { id: blackId },
      select: USER_SELECT,
    });
    if (!blackUser) throw new NotFoundException('User not found');

    await this.prisma.chessRoom.update({
      where: { id: roomId },
      data: { blackId, status: 'ACTIVE' },
    });

    const timeMsPerPlayer = room.timeControl ? room.timeControl * 1000 : Infinity;
    const chess = new Chess();
    const game: ActiveGame = {
      roomId,
      chess,
      whiteId: room.whiteId!,
      blackId,
      whiteTimeMs: timeMsPerPlayer,
      blackTimeMs: timeMsPerPlayer,
      lastMoveAt: Date.now(),
      turn: 'w',
    };
    this.games.set(roomId, game);

    return {
      roomId,
      fen: chess.fen(),
      white: room.white!,
      black: blackUser,
      timeControl: room.timeControl,
      whiteTimeMs: timeMsPerPlayer,
      blackTimeMs: timeMsPerPlayer,
      turn: 'w',
    };
  }

  getActiveGame(roomId: string): ActiveGame | undefined {
    return this.games.get(roomId);
  }

  getActiveGameForUser(userId: string): ActiveGame | undefined {
    for (const game of this.games.values()) {
      if (game.whiteId === userId || game.blackId === userId) return game;
    }
    return undefined;
  }

  async getGameStartedPayload(roomId: string): Promise<ChessGameStartedPayload | null> {
    const game = this.games.get(roomId);
    if (!game) return null;
    const room = await this.prisma.chessRoom.findUnique({
      where: { id: roomId },
      include: {
        white: { select: USER_SELECT },
        black: { select: USER_SELECT },
      },
    });
    if (!room || !room.white || !room.black) return null;
    return {
      roomId,
      fen: game.chess.fen(),
      white: room.white,
      black: room.black,
      timeControl: room.timeControl,
      whiteTimeMs: game.whiteTimeMs,
      blackTimeMs: game.blackTimeMs,
      turn: game.turn,
    };
  }

  // ── Move processing ────────────────────────────────────────────────────────

  makeMove(
    roomId: string,
    userId: string,
    from: string,
    to: string,
    promotion?: string,
  ):
    | { status: 'illegal'; reason: string }
    | { status: 'timeout'; result: ChessResult }
    | { status: 'moved'; payload: ChessMoveMadePayload; gameOver?: { result: ChessResult; reason: ChessEndReason } } {
    const game = this.games.get(roomId);
    if (!game) return { status: 'illegal', reason: 'Game not found' };

    const isWhiteTurn = game.turn === 'w';
    const expectedPlayer = isWhiteTurn ? game.whiteId : game.blackId;
    if (userId !== expectedPlayer) return { status: 'illegal', reason: 'Not your turn' };

    // Deduct clock time before applying move
    const elapsed = Date.now() - game.lastMoveAt;
    if (isWhiteTurn) {
      game.whiteTimeMs = deductClock(game.whiteTimeMs, elapsed);
      if (game.whiteTimeMs === 0) return { status: 'timeout', result: 'BLACK_WIN' };
    } else {
      game.blackTimeMs = deductClock(game.blackTimeMs, elapsed);
      if (game.blackTimeMs === 0) return { status: 'timeout', result: 'WHITE_WIN' };
    }

    // Validate and apply move
    const moveResult = game.chess.move({ from, to, promotion });
    if (!moveResult) return { status: 'illegal', reason: 'Illegal move' };

    game.turn = game.chess.turn();
    game.lastMoveAt = Date.now();

    const payload = this.buildMovePayload(game, moveResult);

    // Check game-ending conditions
    if (game.chess.isCheckmate()) {
      const result: ChessResult = moveResult.color === 'w' ? 'WHITE_WIN' : 'BLACK_WIN';
      return { status: 'moved', payload, gameOver: { result, reason: 'CHECKMATE' } };
    }
    if (game.chess.isStalemate()) return { status: 'moved', payload, gameOver: { result: 'DRAW', reason: 'STALEMATE' } };
    if (game.chess.isInsufficientMaterial()) return { status: 'moved', payload, gameOver: { result: 'DRAW', reason: 'INSUFFICIENT_MATERIAL' } };
    if (game.chess.isThreefoldRepetition()) return { status: 'moved', payload, gameOver: { result: 'DRAW', reason: 'THREEFOLD_REPETITION' } };
    if (game.chess.isDraw()) return { status: 'moved', payload, gameOver: { result: 'DRAW', reason: 'FIFTY_MOVE_RULE' } };

    return { status: 'moved', payload };
  }

  private buildMovePayload(game: ActiveGame, move: any): ChessMoveMadePayload {
    return {
      fen: game.chess.fen(),
      move: { from: move.from, to: move.to, san: move.san ?? '' },
      turn: game.turn,
      whiteTimeMs: game.whiteTimeMs,
      blackTimeMs: game.blackTimeMs,
    };
  }

  // ── Game ending ────────────────────────────────────────────────────────────

  async endGame(
    roomId: string,
    result: ChessResult,
    reason: ChessEndReason,
  ): Promise<ChessGameOverPayload> {
    const game = this.games.get(roomId);
    if (!game) throw new NotFoundException('Active game not found');

    const [whitePlayer, blackPlayer] = await Promise.all([
      this.getOrCreatePlayer(game.whiteId),
      this.getOrCreatePlayer(game.blackId),
    ]);

    const whiteScore: 0 | 0.5 | 1 =
      result === 'WHITE_WIN' ? 1 : result === 'BLACK_WIN' ? 0 : 0.5;
    const blackScore: 0 | 0.5 | 1 =
      result === 'BLACK_WIN' ? 1 : result === 'WHITE_WIN' ? 0 : 0.5;

    const newWhiteElo = calculateElo(whitePlayer.elo, blackPlayer.elo, whiteScore);
    const newBlackElo = calculateElo(blackPlayer.elo, whitePlayer.elo, blackScore);
    const whiteEloChange = newWhiteElo - whitePlayer.elo;
    const blackEloChange = newBlackElo - blackPlayer.elo;

    await this.prisma.$transaction([
      this.prisma.chessPlayer.update({
        where: { userId: game.whiteId },
        data: {
          elo: newWhiteElo,
          wins: { increment: result === 'WHITE_WIN' ? 1 : 0 },
          losses: { increment: result === 'BLACK_WIN' ? 1 : 0 },
          draws: { increment: result === 'DRAW' ? 1 : 0 },
          gamesPlayed: { increment: 1 },
        },
      }),
      this.prisma.chessPlayer.update({
        where: { userId: game.blackId },
        data: {
          elo: newBlackElo,
          wins: { increment: result === 'BLACK_WIN' ? 1 : 0 },
          losses: { increment: result === 'WHITE_WIN' ? 1 : 0 },
          draws: { increment: result === 'DRAW' ? 1 : 0 },
          gamesPlayed: { increment: 1 },
        },
      }),
      this.prisma.chessGame.create({
        data: {
          roomId,
          whiteId: game.whiteId,
          blackId: game.blackId,
          result,
          endReason: reason,
          whiteEloChange,
          blackEloChange,
        },
      }),
      this.prisma.chessRoom.update({
        where: { id: roomId },
        data: { status: 'FINISHED' },
      }),
    ]);

    this.games.delete(roomId);

    return {
      result,
      reason,
      whiteElo: newWhiteElo,
      blackElo: newBlackElo,
      whiteEloChange,
      blackEloChange,
    };
  }

  private async getOrCreatePlayer(userId: string) {
    return this.prisma.chessPlayer.upsert({
      where: { userId },
      create: { userId, elo: 1200 },
      update: {},
    });
  }
}
