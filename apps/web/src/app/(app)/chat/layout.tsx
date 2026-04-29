'use client';

import { useAuth } from 'react-oidc-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useChatSocket } from '@/hooks/useChat';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import type { ChatRoom } from '@enterprise/shared';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const token = auth.user?.access_token;

  useChatSocket(token);

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.get<ChatRoom[]>('/chat/rooms', token),
    enabled: !!token,
    refetchInterval: 30_000,
  });

  return (
    <div className="flex h-full">
      <ChatSidebar rooms={rooms} isLoading={isLoading} />
      <div className="flex-1 flex flex-col min-w-0">{children}</div>
    </div>
  );
}
