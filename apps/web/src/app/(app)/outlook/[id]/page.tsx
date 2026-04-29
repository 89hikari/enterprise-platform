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

  if (isLoading) return <div className="p-6 text-gray-400">Loading…</div>;
  if (!msg) return <div className="p-6 text-gray-400">Message not found.</div>;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-gray-200 bg-white shrink-0 flex items-center gap-3">
        <Link href="/outlook" className="text-sm text-gray-500 hover:text-gray-900">← Back</Link>
        <div className="flex-1" />
        <Link
          href={`/outlook/compose?replyTo=${encodeURIComponent(msg.from.emailAddress.address)}&subject=${encodeURIComponent('Re: ' + (msg.subject ?? ''))}`}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Reply
        </Link>
        <a href={msg.webLink} target="_blank" rel="noreferrer" className="text-sm text-gray-400 hover:text-gray-600">
          Open in Outlook ↗
        </a>
      </div>

      {/* Message content */}
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl">
        <h1 className="text-xl font-bold text-gray-900 mb-3">{msg.subject ?? '(no subject)'}</h1>

        <div className="flex items-start gap-3 mb-4 pb-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
            {(msg.from.emailAddress.name || msg.from.emailAddress.address)[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{msg.from.emailAddress.name || msg.from.emailAddress.address}</p>
            <p className="text-xs text-gray-400">{msg.from.emailAddress.address}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              To: {msg.toRecipients.map((r) => r.emailAddress.address).join(', ')}
            </p>
          </div>
          <span className="ml-auto text-xs text-gray-400 shrink-0">
            {new Date(msg.receivedDateTime).toLocaleString()}
          </span>
        </div>

        {msg.body.contentType === 'html' ? (
          <div
            className="prose prose-sm max-w-none text-gray-800"
            dangerouslySetInnerHTML={{ __html: msg.body.content }}
          />
        ) : (
          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">{msg.body.content}</pre>
        )}
      </div>
    </div>
  );
}
