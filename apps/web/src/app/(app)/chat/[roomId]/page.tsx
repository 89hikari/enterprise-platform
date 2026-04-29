'use client';

import { use, useEffect, useRef } from 'react';
import { useAuth } from 'react-oidc-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useChatSocket } from '@/hooks/useChat';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { MessageInput } from '@/components/chat/MessageInput';
import type { ChatMessage, ChatRoom } from '@enterprise/shared';

export default function ChatRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const auth = useAuth();
  const token = auth.user?.access_token;
  const { joinRoom, leaveRoom, sendMessage, sendTyping, markRead } = useChatSocket(token);

  const { data: room } = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => api.get<ChatRoom>(`/chat/rooms/${roomId}`, token),
    enabled: !!token,
  });

  const { data: msgData, fetchNextPage, hasNextPage } = useQuery({
    queryKey: ['messages', roomId],
    queryFn: () => api.get<{ data: ChatMessage[]; nextCursor: string | null; hasMore: boolean }>(
      `/chat/rooms/${roomId}/messages?limit=50`, token,
    ),
    enabled: !!token && !!roomId,
  }) as any;

  useEffect(() => {
    if (!roomId) return;
    joinRoom(roomId);
    markRead(roomId);
    return () => leaveRoom(roomId);
  }, [roomId, joinRoom, leaveRoom, markRead]);

  const handleSend = (payload: any) => {
    sendMessage(roomId, payload);
    markRead(roomId);
  };

  const handleLoadMore = () => {
    const cursor = msgData?.nextCursor;
    if (cursor && hasNextPage !== false) {
      api.get<{ data: ChatMessage[]; nextCursor: string | null; hasMore: boolean }>(
        `/chat/rooms/${roomId}/messages?cursor=${cursor}&limit=50`, token,
      );
    }
  };

  const messages: ChatMessage[] = msgData?.data ?? [];
  const currentUserId = auth.user?.profile.sub ?? '';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        <p className="font-semibold text-gray-900">{room?.name ?? '...'}</p>
        {room?.members && (
          <p className="text-xs text-gray-400">{room.members.length} members</p>
        )}
      </div>

      {/* Messages */}
      <ChatWindow
        messages={messages}
        currentUserId={currentUserId}
        onLoadMore={handleLoadMore}
        hasMore={msgData?.hasMore ?? false}
      />

      {/* Input */}
      <MessageInput
        roomId={roomId}
        token={token}
        onSend={handleSend}
        onTyping={(typing) => sendTyping(roomId, typing)}
      />
    </div>
  );
}
