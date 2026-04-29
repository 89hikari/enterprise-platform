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
          <p className="text-4xl mb-3">✅</p>
          <p className="text-gray-700 font-medium">Message sent!</p>
          <p className="text-sm text-gray-400 mt-1">Redirecting to inbox…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white shrink-0 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">New Message</h1>
        <div className="flex gap-3">
          <Link href="/outlook" className="text-sm text-gray-500 hover:text-gray-800">Discard</Link>
          <button
            onClick={() => send.mutate()}
            disabled={!to.trim() || !subject.trim() || !body.trim() || send.isPending}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {send.isPending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl space-y-3">
        {send.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
            Failed to send message. Please try again.
          </div>
        )}

        <div className="flex items-center gap-3 border-b border-gray-100 py-2">
          <label className="text-sm text-gray-500 w-12 shrink-0">To</label>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com, another@example.com"
            className="flex-1 text-sm outline-none text-gray-800 placeholder:text-gray-300"
          />
        </div>

        <div className="flex items-center gap-3 border-b border-gray-100 py-2">
          <label className="text-sm text-gray-500 w-12 shrink-0">Cc</label>
          <input
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="cc@example.com"
            className="flex-1 text-sm outline-none text-gray-800 placeholder:text-gray-300"
          />
        </div>

        <div className="flex items-center gap-3 border-b border-gray-100 py-2">
          <label className="text-sm text-gray-500 w-12 shrink-0">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 text-sm outline-none text-gray-800 placeholder:text-gray-300"
          />
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message…"
          className="w-full min-h-[300px] text-sm text-gray-800 outline-none resize-none placeholder:text-gray-300 pt-3"
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
