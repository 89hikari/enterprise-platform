'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from 'react-oidc-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { clsx } from 'clsx';
import type { ChatRoom } from '@enterprise/shared';

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

  const createDirect = useMutation({
    mutationFn: (userId: string) =>
      api.post<ChatRoom>('/chat/rooms', { type: 'direct', memberIds: [userId] }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  });

  return (
    <div className="w-64 border-r border-gray-200 bg-white flex flex-col h-full shrink-0">
      <div className="p-3 border-b border-gray-100 flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-sm">Messages</span>
        <Link
          href="/users"
          title="New chat"
          className="text-gray-400 hover:text-blue-600 text-lg leading-none"
        >
          +
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-4 text-sm text-gray-400">Loading...</div>
        )}
        {!isLoading && rooms.length === 0 && (
          <div className="p-4 text-sm text-gray-400 text-center">No conversations yet</div>
        )}
        {rooms.map((room) => {
          const isActive = pathname === `/chat/${room.id}`;
          const lastMsg = room.lastMessage;
          return (
            <Link
              key={room.id}
              href={`/chat/${room.id}`}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors',
                isActive && 'bg-blue-50',
              )}
            >
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                {room.avatarUrl ? (
                  <img src={room.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  (room.name ?? '?')[0].toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className={clsx('text-sm truncate', isActive ? 'font-semibold text-blue-700' : 'font-medium text-gray-900')}>
                    {room.name ?? 'Chat'}
                  </span>
                  {lastMsg && (
                    <span className="text-xs text-gray-400 ml-1 shrink-0">
                      {formatTime(lastMsg.createdAt)}
                    </span>
                  )}
                </div>
                {lastMsg && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {lastMsg.isDeleted
                      ? 'Message deleted'
                      : lastMsg.messageType === 'text'
                        ? lastMsg.content ?? ''
                        : `📎 ${lastMsg.messageType}`}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
