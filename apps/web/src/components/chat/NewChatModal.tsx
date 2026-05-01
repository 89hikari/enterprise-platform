'use client';

import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import type { User, ChatRoom } from '@enterprise/shared';

interface Props {
  token: string | undefined;
  onClose: () => void;
  onCreated: () => void;
}

export function NewChatModal({ token, onClose, onCreated }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState<string | null>(null);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () => api.get<{ data: User[]; total: number }>(`/users?search=${encodeURIComponent(search)}&limit=50`, token),
    enabled: !!token && search.length >= 1,
  });

  const createRoom = useMutation({
    mutationFn: (userId: string) =>
      api.post<ChatRoom>('/chat/rooms', { type: 'direct', memberIds: [userId] }, token),
    onSuccess: (room) => {
      onCreated();
      router.push(`/chat/${room.id}`);
    },
    onSettled: () => setCreating(null),
  });

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const users = usersData?.data ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-32 px-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-80 p-4"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>new message</h2>
        <input
          ref={inputRef}
          autoFocus
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search people..."
          className="terminal-input w-full mb-3"
        />

        <div className="max-h-64 overflow-y-auto">
          {isLoading && <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>searching...</p>}

          {users.length === 0 && search.length >= 1 && !isLoading && (
            <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>no users found</p>
          )}

          {search.length === 0 && (
            <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>type to search...</p>
          )}

          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => { setCreating(user.id); createRoom.mutate(user.id); }}
              disabled={creating === user.id}
              className="w-full flex items-center gap-3 p-2 transition-colors text-left"
              style={{
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div
                className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  `${user.firstName[0]}${user.lastName[0]}`
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {user.positionName ?? user.role}
                </p>
              </div>
              {creating === user.id && (
                <span className="text-xs" style={{ color: 'var(--accent)' }}>creating...</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
