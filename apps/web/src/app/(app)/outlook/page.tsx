'use client';

import { useAuth } from 'react-oidc-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import Link from 'next/link';

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
          <p className="text-3xl mb-4" style={{ color: 'var(--text-muted)' }}>✉</p>
          <h2 className="terminal-heading mb-2">connect your outlook</h2>
          <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--text-muted)' }}>
            connect your microsoft account to read and send emails directly from this app.
          </p>
          <a
            href={`${apiBase}/oauth/microsoft/authorize?product=outlook`}
            className="terminal-btn terminal-btn-primary inline-block"
          >
            connect microsoft account
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b shrink-0 flex items-center justify-between" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
        <h1 className="terminal-heading text-base">inbox</h1>
        <Link
          href="/outlook/compose"
          className="terminal-btn terminal-btn-primary text-xs"
        >
          <span>+</span>
          compose
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-6 text-sm" style={{ color: 'var(--text-muted)' }}>loading messages...</div>
        )}
        {messages?.value.map((msg) => (
          <Link
            key={msg.id}
            href={`/outlook/${msg.id}`}
            onClick={() => !msg.isRead && markRead.mutate(msg.id)}
            className="flex items-start gap-4 px-6 py-3 border-b transition-colors"
            style={{
              background: !msg.isRead ? 'var(--info-soft)' : 'transparent',
              borderColor: 'var(--border)',
            }}
          >
            <div className="w-1.5 h-1.5 rounded mt-2 shrink-0" style={{ background: msg.isRead ? 'transparent' : 'var(--info)' }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm truncate" style={{ fontWeight: !msg.isRead ? 600 : 400 }}>
                  {msg.from.emailAddress.name || msg.from.emailAddress.address}
                </span>
                <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {new Date(msg.receivedDateTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="text-sm truncate" style={{ fontWeight: !msg.isRead ? 500 : 400 }}>
                {msg.subject ?? '(no subject)'}
              </p>
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{msg.bodyPreview}</p>
            </div>
            {msg.hasAttachments && <span className="text-xs shrink-0 mt-1" style={{ color: 'var(--text-muted)' }}>▤</span>}
          </Link>
        ))}
        {messages?.value.length === 0 && (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>inbox is empty.</div>
        )}
      </div>
    </div>
  );
}
