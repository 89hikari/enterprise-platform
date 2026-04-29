'use client';

import { use } from 'react';
import { useAuth } from 'react-oidc-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import Link from 'next/link';

interface MailDetail {
  id: string;
  subject: string | null;
  receivedDateTime: string;
  from: { emailAddress: { name: string; address: string } };
  toRecipients: { emailAddress: { name: string; address: string } }[];
  body: { contentType: string; content: string };
  hasAttachments: boolean;
  webLink: string;
}

export default function OutlookMessagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const auth = useAuth();
  const token = auth.user?.access_token;

  const { data: msg, isLoading } = useQuery<MailDetail>({
    queryKey: ['outlook-message', id],
    queryFn: () => api.get(`/outlook/messages/${id}`, token),
    enabled: !!token && !!id,
  });

  if (isLoading) return <div className="p-6" style={{ color: 'var(--text-muted)' }}>loading...</div>;
  if (!msg) return <div className="p-6" style={{ color: 'var(--text-muted)' }}>message not found.</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-2 border-b shrink-0 flex items-center gap-3" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
        <Link href="/outlook" className="text-xs terminal-link">← back</Link>
        <div className="flex-1" />
        <Link
          href={`/outlook/compose?replyTo=${encodeURIComponent(msg.from.emailAddress.address)}&subject=${encodeURIComponent('Re: ' + (msg.subject ?? ''))}`}
          className="text-xs terminal-link"
        >
          reply
        </Link>
        <a href={msg.webLink} target="_blank" rel="noreferrer" className="text-xs terminal-link">
          open in outlook ↗
        </a>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-3xl">
        <h1 className="text-lg font-bold mb-3">{msg.subject ?? '(no subject)'}</h1>

        <div className="flex items-start gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div
            className="w-8 h-8 rounded flex items-center justify-center font-bold text-xs shrink-0"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            {(msg.from.emailAddress.name || msg.from.emailAddress.address)[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium">{msg.from.emailAddress.name || msg.from.emailAddress.address}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{msg.from.emailAddress.address}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              to: {msg.toRecipients.map((r) => r.emailAddress.address).join(', ')}
            </p>
          </div>
          <span className="ml-auto text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
            {new Date(msg.receivedDateTime).toLocaleString()}
          </span>
        </div>

        {msg.body.contentType === 'html' ? (
          <div
            className="prose prose-sm max-w-none"
            style={{ color: 'var(--text)' }}
            dangerouslySetInnerHTML={{ __html: msg.body.content }}
          />
        ) : (
          <pre className="text-sm whitespace-pre-wrap font-mono" style={{ color: 'var(--text)' }}>{msg.body.content}</pre>
        )}
      </div>
    </div>
  );
}
