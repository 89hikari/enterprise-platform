'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getChatSocket, disconnectAll } from '@/lib/socket-client';
import type { ChatMessage, ChatRoom } from '@enterprise/shared';

export function useChatSocket(token: string | undefined) {
  const qc = useQueryClient();
  const socketRef = useRef<ReturnType<typeof getChatSocket> | null>(null);

  useEffect(() => {
    if (!token) return;
    const socket = getChatSocket(token);
    socketRef.current = socket;

    socket.on('message_received', (message: ChatMessage) => {
      // Append to the room's message list
      qc.setQueryData<{ data: ChatMessage[]; nextCursor: string | null; hasMore: boolean }>(
        ['messages', message.roomId],
        (old) => old ? { ...old, data: [...old.data, message] } : old,
      );
      // Update the room's last message in the rooms list
      qc.setQueryData<ChatRoom[]>(['rooms'], (old) =>
        old?.map((r) => r.id === message.roomId ? { ...r, lastMessage: message } : r),
      );
    });

    socket.on('message_deleted', ({ messageId, roomId }: { messageId: string; roomId: string }) => {
      qc.setQueryData<{ data: ChatMessage[] }>(['messages', roomId], (old) =>
        old ? { ...old, data: old.data.map((m) => m.id === messageId ? { ...m, isDeleted: true, content: null } : m) } : old,
      );
    });

    return () => {
      socket.off('message_received');
      socket.off('message_deleted');
    };
  }, [token, qc]);

  const joinRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('join_room', { roomId });
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('leave_room', { roomId });
  }, []);

  const sendMessage = useCallback(
    (roomId: string, payload: Omit<Parameters<typeof getChatSocket>[0], never> & {
      messageType: string; content?: string; fileUrl?: string;
      fileName?: string; fileSize?: number; durationSeconds?: number; replyToMessageId?: string;
    }) => {
      socketRef.current?.emit('send_message', { roomId, ...payload });
    },
    [],
  );

  const sendTyping = useCallback((roomId: string, isTyping: boolean) => {
    socketRef.current?.emit(isTyping ? 'typing_start' : 'typing_stop', { roomId });
  }, []);

  const markRead = useCallback((roomId: string) => {
    socketRef.current?.emit('mark_read', { roomId });
  }, []);

  return { joinRoom, leaveRoom, sendMessage, sendTyping, markRead };
}
