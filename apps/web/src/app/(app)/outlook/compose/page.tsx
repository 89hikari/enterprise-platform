'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from 'react-oidc-context';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import Link from 'next/link';

function ComposeForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = useAuth();
  const token = auth.user?.access_token;

  const [to, setTo] = useState(searchParams.get('replyTo') ?? '');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(searchParams.get('subject') ?? '');
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);

  const send = useMutation({
    mutationFn: () =>
      api.post('/outlook/send', {
        to: to.split(',').map((s) => s.trim()).filter(Boolean),
        cc: cc ? cc.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        subject,
        body,
      }, token),
    onSuccess: () => {
      setSent(true);
      setTimeout(() => router.push('/outlook'), 1500);
    },
  });

  if (sent) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-2xl mb-3" style={{ color: 'var(--success)' }}>✓</p>
          <p className="font-medium">message sent!</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>redirecting to inbox...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b shrink-0 flex items-center justify-between" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
        <h1 className="terminal-heading text-base">new message</h1>
        <div className="flex gap-3">
          <Link href="/outlook" className="text-xs terminal-link">discard</Link>
          <button
            onClick={() => send.mutate()}
            disabled={!to.trim() || !subject.trim() || !body.trim() || send.isPending}
            className="terminal-btn terminal-btn-primary text-xs"
          >
            {send.isPending ? 'sending...' : 'send'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-3xl space-y-0">
        {send.error && (
          <div className="text-sm px-4 py-2 rounded mb-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
            failed to send message. please try again.
          </div>
        )}

        <div className="flex items-center gap-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <label className="text-xs w-12 shrink-0" style={{ color: 'var(--text-secondary)' }}>to</label>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="flex-1 text-sm outline-none bg-transparent placeholder:opacity-30"
            style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}
          />
        </div>

        <div className="flex items-center gap-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <label className="text-xs w-12 shrink-0" style={{ color: 'var(--text-secondary)' }}>cc</label>
          <input
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="cc@example.com"
            className="flex-1 text-sm outline-none bg-transparent placeholder:opacity-30"
            style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}
          />
        </div>

        <div className="flex items-center gap-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <label className="text-xs w-12 shrink-0" style={{ color: 'var(--text-secondary)' }}>subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="subject"
            className="flex-1 text-sm outline-none bg-transparent placeholder:opacity-30"
            style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}
          />
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="write your message..."
          className="w-full min-h-[300px] text-sm outline-none resize-none pt-3 bg-transparent placeholder:opacity-30"
          style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}
        />
      </div>
    </div>
  );
}

export default function ComposePage() {
  return (
    <Suspense>
      <ComposeForm />
    </Suspense>
  );
}
