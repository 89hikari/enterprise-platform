'use client';

import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from '@enterprise/shared';

interface Props {
  messages: ChatMessage[];
  currentUserId: string;
  onLoadMore: () => void;
  hasMore: boolean;
}

export function ChatWindow({ messages, currentUserId, onLoadMore, hasMore }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    if (containerRef.current.scrollTop === 0 && hasMore) {
      onLoadMore();
    }
  };

  const grouped = messages.map((msg, i) => ({
    ...msg,
    showSender: i === 0 || messages[i - 1].senderId !== msg.senderId,
  }));

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5"
      style={{ background: 'var(--bg)' }}
    >
      {hasMore && (
        <div className="text-center py-2">
          <button onClick={onLoadMore} className="text-xs terminal-link">
            load older messages
          </button>
        </div>
      )}

      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--text-muted)' }}>
          no messages yet. say hello!
        </div>
      )}

      {grouped.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isOwn={msg.senderId === currentUserId}
        />
      ))}

      <div ref={bottomRef} />
    </div>
  );
}
