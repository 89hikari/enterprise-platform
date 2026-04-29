'use client';

import { use, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import Link from 'next/link';
import { clsx } from 'clsx';

interface Channel { id: string; displayName: string; description: string | null; membershipType: string }
interface TeamMessage {
  id: string;
  createdDateTime: string;
  from: { user?: { displayName: string; id: string } } | null;
  body: { contentType: string; content: string };
}

export default function TeamDetailPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params);
  const auth = useAuth();
  const token = auth.user?.access_token;
  const qc = useQueryClient();

  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [newMessage, setNewMessage] = useState('');

  const { data: channels, isLoading: loadingChannels } = useQuery<Channel[]>({
    queryKey: ['channels', teamId],
    queryFn: () => api.get(`/teams/${teamId}/channels`, token),
    enabled: !!token && !!teamId,
    select: (data) => data.filter((c) => c.membershipType === 'standard' || c.membershipType === 'private'),
  });

  const { data: messages, isLoading: loadingMessages } = useQuery<{ value: TeamMessage[] }>({
    queryKey: ['team-messages', teamId, selectedChannel?.id],
    queryFn: () => api.get(`/teams/${teamId}/channels/${selectedChannel!.id}/messages?top=30`, token),
    enabled: !!token && !!selectedChannel,
  });

  const sendMessage = useMutation({
    mutationFn: () =>
      api.post(`/teams/${teamId}/channels/${selectedChannel!.id}/messages`, { content: newMessage }, token),
    onSuccess: () => {
      setNewMessage('');
      qc.invalidateQueries({ queryKey: ['team-messages', teamId, selectedChannel?.id] });
    },
  });

  return (
    <div className="flex h-full">
      {/* Channel list */}
      <div className="w-60 shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-3 border-b border-gray-100 flex items-center gap-2">
          <Link href="/teams" className="text-gray-400 hover:text-gray-700 text-sm">←</Link>
          <span className="font-semibold text-sm text-gray-800 truncate">Channels</span>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {loadingChannels && <p className="p-3 text-xs text-gray-400">Loading…</p>}
          {channels?.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setSelectedChannel(ch)}
              className={clsx(
                'w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors',
                selectedChannel?.id === ch.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700',
              )}
            >
              # {ch.displayName}
            </button>
          ))}
        </div>
      </div>

      {/* Messages panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedChannel ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Select a channel to view messages
          </div>
        ) : (
          <>
            {/* Channel header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-white shrink-0">
              <h2 className="font-semibold text-gray-900"># {selectedChannel.displayName}</h2>
              {selectedChannel.description && (
                <p className="text-xs text-gray-400 mt-0.5">{selectedChannel.description}</p>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages && <p className="text-xs text-gray-400">Loading messages…</p>}
              {[...(messages?.value ?? [])].reverse().map((msg) => (
                <div key={msg.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs shrink-0">
                    {(msg.from?.user?.displayName ?? '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {msg.from?.user?.displayName ?? 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(msg.createdDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {msg.body.contentType === 'html' ? (
                      <div
                        className="text-sm text-gray-800 mt-0.5 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: msg.body.content }}
                      />
                    ) : (
                      <p className="text-sm text-gray-800 mt-0.5 whitespace-pre-wrap">{msg.body.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {messages?.value.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No messages yet.</p>
              )}
            </div>

            {/* Message input */}
            <div className="p-3 border-t border-gray-200 bg-white shrink-0">
              <div className="flex gap-2">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message #${selectedChannel.displayName}`}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && newMessage.trim()) {
                      e.preventDefault();
                      sendMessage.mutate();
                    }
                  }}
                />
                <button
                  onClick={() => sendMessage.mutate()}
                  disabled={!newMessage.trim() || sendMessage.isPending}
                  className="text-blue-600 disabled:text-gray-300 hover:text-blue-800 transition-colors px-1"
                >
                  ➤
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
