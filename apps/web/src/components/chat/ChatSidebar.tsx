'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from 'react-oidc-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { NewChatModal } from './NewChatModal';
import type { ChatRoom } from '@enterprise/shared';
import { useState } from 'react';

interface Props {
  rooms: ChatRoom[];
  isLoading: boolean;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function ChatSidebar({ rooms, isLoading }: Props) {
  const pathname = usePathname();
  const auth = useAuth();
  const token = auth.user?.access_token;
  const qc = useQueryClient();
  const [showNewChat, setShowNewChat] = useState(false);

  const createDirect = useMutation({
    mutationFn: (userId: string) =>
      api.post<ChatRoom>('/chat/rooms', { type: 'direct', memberIds: [userId] }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  });

  return (
    <div className="w-64 flex flex-col h-full shrink-0 border-r" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
      <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>messages</span>
        <button
          onClick={() => setShowNewChat(true)}
          title="New message"
          className="text-lg leading-none terminal-link cursor-pointer bg-transparent border-0 p-0"
        >
          +
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-4 text-sm" style={{ color: 'var(--text-muted)' }}>loading...</div>
        )}
        {!isLoading && rooms.length === 0 && (
          <div className="p-4 text-sm text-center" style={{ color: 'var(--text-muted)' }}>no conversations</div>
        )}
        {rooms.map((room) => {
          const isActive = pathname === `/chat/${room.id}`;
          const lastMsg = room.lastMessage;
          return (
            <Link
              key={room.id}
              href={`/chat/${room.id}`}
              className="flex items-center gap-3 px-3 py-2 transition-colors"
              style={{
                background: isActive ? 'var(--accent-soft)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              <div
                className="w-8 h-8 rounded flex items-center justify-center font-semibold text-sm shrink-0"
                style={{
                  background: isActive ? 'var(--accent-soft)' : 'var(--bg-surface)',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                {room.avatarUrl ? (
                  <img src={room.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  (room.name ?? '?')[0].toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm truncate font-medium">{room.name ?? 'chat'}</span>
                  {lastMsg && (
                    <span className="text-xs ml-1 shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {formatTime(lastMsg.createdAt)}
                    </span>
                  )}
                </div>
                {lastMsg && (
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {lastMsg.isDeleted
                      ? 'deleted'
                      : lastMsg.messageType === 'text'
                        ? lastMsg.content ?? ''
                        : `[${lastMsg.messageType}]`}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {showNewChat && (
        <NewChatModal
          token={token}
          onClose={() => setShowNewChat(false)}
          onCreated={() => {
            setShowNewChat(false);
            qc.invalidateQueries({ queryKey: ['rooms'] });
          }}
        />
      )}
    </div>
  );
}
