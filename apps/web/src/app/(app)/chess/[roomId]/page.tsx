'use client';

import { use, useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useRouter } from 'next/navigation';
import { getChessSocket } from '@/lib/socket-client';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { ChessClock } from '@/components/chess/ChessClock';
import { GameOverModal } from '@/components/chess/GameOverModal';
import { DrawOfferBanner } from '@/components/chess/DrawOfferBanner';
import type {
  ChessGameStartedPayload,
  ChessMoveMadePayload,
  ChessGameOverPayload,
  ChessUserSummary,
} from '@enterprise/shared';

interface GameState {
  fen: string;
  turn: 'w' | 'b';
  whiteTimeMs: number;
  blackTimeMs: number;
  white: ChessUserSummary;
  black: ChessUserSummary;
  timeControl: number | null;
}

export default function ChessRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const auth = useAuth();
  const token = auth.user?.access_token;
  const router = useRouter();
  const myId = auth.user?.profile.sub ?? '';

  const [game, setGame] = useState<GameState | null>(null);
  const [gameOver, setGameOver] = useState<ChessGameOverPayload | null>(null);
  const [drawOffered, setDrawOffered] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [socketDisconnected, setSocketDisconnected] = useState(false);

  const myColor = game ? (game.white.id === myId ? 'white' : 'black') : 'white';
  const isMyTurn = game
    ? game.turn === 'w' ? game.white.id === myId : game.black.id === myId
    : false;

  useEffect(() => {
    if (!token) return;
    const socket = getChessSocket(token);

    socket.emit('join_room', { roomId });

    const onGameStarted = (data: ChessGameStartedPayload) => {
      setGame({
        fen: data.fen,
        turn: data.turn,
        whiteTimeMs: data.whiteTimeMs,
        blackTimeMs: data.blackTimeMs,
        white: data.white,
        black: data.black,
        timeControl: data.timeControl,
      });
    };

    const onMoveMade = (data: ChessMoveMadePayload) => {
      setGame((prev) =>
        prev ? { ...prev, fen: data.fen, turn: data.turn, whiteTimeMs: data.whiteTimeMs, blackTimeMs: data.blackTimeMs } : prev,
      );
      setDrawOffered(false);
    };

    socket.on('game_started', onGameStarted);
    socket.on('move_made', onMoveMade);
    socket.on('draw_offered', () => setDrawOffered(true));
    socket.on('draw_declined', () => setDrawOffered(false));
    socket.on('game_over', (data: ChessGameOverPayload) => setGameOver(data));
    socket.on('opponent_disconnected', () => setOpponentDisconnected(true));
    socket.on('opponent_reconnected', () => setOpponentDisconnected(false));

    const onReconnect = () => {
      setSocketDisconnected(false);
      socket.emit('join_room', { roomId });
    };

    const onDisconnect = () => {
      setSocketDisconnected(true);
    };

    socket.on('reconnect', onReconnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('game_started', onGameStarted);
      socket.off('move_made', onMoveMade);
      socket.off('draw_offered');
      socket.off('draw_declined');
      socket.off('game_over');
      socket.off('opponent_disconnected');
      socket.off('opponent_reconnected');
      socket.off('reconnect', onReconnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [token, roomId]);

  const handleMove = (from: string, to: string, promotion?: string): boolean => {
    if (!token || !isMyTurn || gameOver) return false;
    getChessSocket(token).emit('make_move', { roomId, from, to, promotion });
    return true;
  };

  const handleOfferDraw = () => {
    if (!token) return;
    getChessSocket(token).emit('offer_draw', { roomId });
  };

  const handleResign = () => {
    if (!token) return;
    getChessSocket(token).emit('resign', { roomId });
  };

  const handleDrawResponse = (accept: boolean) => {
    if (!token) return;
    getChessSocket(token).emit('respond_draw', { roomId, accept });
    setDrawOffered(false);
  };

  if (!game) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg terminal-cursor" style={{ color: 'var(--text-secondary)' }}>waiting for opponent</p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>share the room link or wait for someone to join</p>
        </div>
      </div>
    );
  }

  const opponent = myColor === 'white' ? game.black : game.white;
  const myTimeMs = myColor === 'white' ? game.whiteTimeMs : game.blackTimeMs;
  const opponentTimeMs = myColor === 'white' ? game.blackTimeMs : game.whiteTimeMs;

  return (
    <div className="flex h-full p-6 gap-6 items-start justify-center">
      <div className="flex flex-col gap-3" style={{ width: 480 }}>
        <div
          className="flex items-center gap-3 p-3 rounded"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: 'var(--bg-active)', color: 'var(--text-secondary)' }}
          >
            {opponent.firstName[0]}
          </div>
          <span className="flex-1 text-sm font-medium">
            {opponent.firstName} {opponent.lastName}
          </span>
          {game.timeControl && (
            <ChessClock timeMs={opponentTimeMs} isRunning={!isMyTurn && !gameOver} />
          )}
        </div>

        <div style={{ width: 480 }}>
          <ChessBoard
            fen={game.fen}
            orientation={myColor}
            onMove={handleMove}
            isMyTurn={isMyTurn && !gameOver}
          />
        </div>

        <div
          className="flex items-center gap-3 p-3 rounded"
          style={{
            background: 'var(--accent-soft)',
            border: '1px solid var(--accent)',
          }}
        >
          <div
            className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            {auth.user?.profile.given_name?.[0] ?? '?'}
          </div>
          <span className="flex-1 text-sm font-medium">you ({myColor})</span>
          {game.timeControl && (
            <ChessClock timeMs={myTimeMs} isRunning={isMyTurn && !gameOver} />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 w-44 mt-14">
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          {gameOver ? 'game over' : isMyTurn ? 'your turn' : "opponent's turn"}
        </p>

        {opponentDisconnected && !gameOver && (
          <div className="p-3 rounded text-xs" style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning)', color: 'var(--warning)' }}>
            opponent disconnected. 30s to reconnect before forfeit.
          </div>
        )}

        {socketDisconnected && !gameOver && (
          <div className="p-3 rounded text-xs" style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning)', color: 'var(--warning)' }}>
            connection lost. reconnecting...
          </div>
        )}

        {drawOffered && !gameOver && (
          <DrawOfferBanner
            onAccept={() => handleDrawResponse(true)}
            onDecline={() => handleDrawResponse(false)}
          />
        )}

        {!gameOver && (
          <>
            <button
              onClick={handleOfferDraw}
              className="terminal-btn text-xs py-1.5 w-full"
            >
              offer draw
            </button>
            <button
              onClick={handleResign}
              className="terminal-btn terminal-btn-danger text-xs py-1.5 w-full"
            >
              resign
            </button>
          </>
        )}
      </div>

      {gameOver && (
        <GameOverModal
          gameOver={gameOver}
          myColor={myColor}
          onClose={() => router.push('/chess')}
        />
      )}
    </div>
  );
}
