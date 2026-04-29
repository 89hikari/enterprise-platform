'use client';

import { useAuth } from 'react-oidc-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import Link from 'next/link';
import { clsx } from 'clsx';

interface MailMessage {
  id: string;
  subject: string | null;
  bodyPreview: string;
  receivedDateTime: string;
  isRead: boolean;
  from: { emailAddress: { name: string; address: string } };
  hasAttachments: boolean;
}

interface OutlookStatus { connected: boolean; scopes: string[] }
interface MessagesResponse { value: MailMessage[] }

export default function OutlookPage() {
  const auth = useAuth();
  const token = auth.user?.access_token;
  const qc = useQueryClient();

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '/api';

  const { data: status } = useQuery<OutlookStatus>({
    queryKey: ['outlook-status'],
    queryFn: () => api.get('/outlook/status', token),
    enabled: !!token,
  });

  const { data: messages, isLoading } = useQuery<MessagesResponse>({
    queryKey: ['outlook-messages'],
    queryFn: () => api.get('/outlook/messages?top=30', token),
    enabled: !!token && !!status?.connected,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/outlook/messages/${id}/read`, {}, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outlook-messages'] }),
  });

  if (!status?.connected) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-center">
          <p className="text-5xl mb-4">📧</p>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Connect your Outlook</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-xs">
            Connect your Microsoft account to read and send emails directly from this app.
          </p>
          <a
            href={`${apiBase}/oauth/microsoft/authorize?product=outlook`}
            className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Connect Microsoft Account
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white shrink-0 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Inbox</h1>
        <Link
          href="/outlook/compose"
          className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Compose
        </Link>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-6 text-sm text-gray-400">Loading messages…</div>
        )}
        {messages?.value.map((msg) => (
          <Link
            key={msg.id}
            href={`/outlook/${msg.id}`}
            onClick={() => !msg.isRead && markRead.mutate(msg.id)}
            className={clsx(
              'flex items-start gap-4 px-6 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors',
              !msg.isRead && 'bg-blue-50',
            )}
          >
            <div className={clsx('w-2 h-2 rounded-full mt-2 shrink-0', msg.isRead ? 'bg-transparent' : 'bg-blue-500')} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className={clsx('text-sm truncate', !msg.isRead ? 'font-semibold text-gray-900' : 'text-gray-700')}>
                  {msg.from.emailAddress.name || msg.from.emailAddress.address}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(msg.receivedDateTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className={clsx('text-sm truncate', !msg.isRead ? 'font-medium text-gray-800' : 'text-gray-600')}>
                {msg.subject ?? '(no subject)'}
              </p>
              <p className="text-xs text-gray-400 truncate mt-0.5">{msg.bodyPreview}</p>
            </div>
            {msg.hasAttachments && <span className="text-xs text-gray-400 shrink-0 mt-1">📎</span>}
          </Link>
        ))}
        {messages?.value.length === 0 && (
          <div className="p-8 text-center text-gray-400 text-sm">Your inbox is empty.</div>
        )}
      </div>
    </div>
  );
}
