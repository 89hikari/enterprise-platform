'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from 'react-oidc-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { getChessSocket } from '@/lib/socket-client';
import { RoomCard } from '@/components/chess/RoomCard';
import { CreateRoomModal } from '@/components/chess/CreateRoomModal';
import { Leaderboard } from '@/components/chess/Leaderboard';
import type { ChessRoomSummary, ChessPlayerRank, ChessGameStartedPayload } from '@enterprise/shared';

export default function ChessLobby() {
  const auth = useAuth();
  const token = auth.user?.access_token;
  const router = useRouter();
  const qc = useQueryClient();
  const currentUserId = auth.user?.profile.sub ?? '';

  const [tab, setTab] = useState<'rooms' | 'leaderboard'>('rooms');
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<ChessRoomSummary[]>([]);

  const { data: initialRooms } = useQuery({
    queryKey: ['chess-rooms'],
    queryFn: () => api.get<ChessRoomSummary[]>('/chess/rooms', token),
    enabled: !!token,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['chess-leaderboard'],
    queryFn: () => api.get<ChessPlayerRank[]>('/chess/leaderboard', token),
    enabled: !!token && tab === 'leaderboard',
  });

  useEffect(() => {
    if (initialRooms) setRooms(initialRooms);
  }, [initialRooms]);

  useEffect(() => {
    if (!token) return;
    const socket = getChessSocket(token);

    const onRoomList = (list: ChessRoomSummary[]) => setRooms(list);
    const onGameStarted = (payload: ChessGameStartedPayload) => {
      router.push(`/chess/${payload.roomId}`);
    };

    socket.on('room_list', onRoomList);
    socket.on('game_started', onGameStarted);

    return () => {
      socket.off('room_list', onRoomList);
      socket.off('game_started', onGameStarted);
    };
  }, [token, router]);

  const handleCreate = useCallback(async (name: string, timeControl: number | null) => {
    if (!token) return;
    setCreateLoading(true);
    setCreateError(null);

    try {
      await api.post<ChessRoomSummary>('/chess/rooms', { name, timeControl }, token);
      qc.invalidateQueries({ queryKey: ['chess-rooms'] });
      setShowCreate(false);
    } catch (e: any) {
      setCreateError(e.message || 'Failed to create room');
      setCreateLoading(false);
    }
  }, [token, qc]);

  const handleJoin = (roomId: string) => {
    if (!token) return;
    getChessSocket(token).emit('join_room', { roomId });
  };

  const handleCancel = (roomId: string) => {
    if (!token) return;
    getChessSocket(token).emit('leave_room', { roomId });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="terminal-heading terminal-cursor">chess</h1>
        <button
          onClick={() => { setShowCreate(true); setCreateError(null); }}
          className="terminal-btn terminal-btn-primary"
        >
          <span>+</span>
          new room
        </button>
      </div>

      <div className="flex gap-0 mb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => setTab('rooms')}
          className="px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px"
          style={{
            borderColor: tab === 'rooms' ? 'var(--accent)' : 'transparent',
            color: tab === 'rooms' ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          rooms
        </button>
        <button
          onClick={() => setTab('leaderboard')}
          className="px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px"
          style={{
            borderColor: tab === 'leaderboard' ? 'var(--accent)' : 'transparent',
            color: tab === 'leaderboard' ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          leaderboard
        </button>
      </div>

      {tab === 'rooms' && (
        <div className="space-y-2">
          {rooms.length === 0 && (
            <div className="py-12 text-center">
              <p className="terminal-text-muted text-sm">no rooms open. create one to start playing!</p>
              <p className="terminal-text-muted text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                $ chess new --name &quot;quick game&quot;
              </p>
            </div>
          )}
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onJoin={handleJoin}
              onCancel={handleCancel}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}

      {tab === 'leaderboard' && <Leaderboard players={leaderboard ?? []} />}

      {showCreate && (
        <CreateRoomModal
          onSubmit={handleCreate}
          onClose={() => { setShowCreate(false); setCreateError(null); }}
          loading={createLoading}
          error={createError}
        />
      )}
    </div>
  );
}
