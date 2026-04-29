'use client';

import { useAuth } from 'react-oidc-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import Link from 'next/link';
import type { NewsPost, KanbanCard } from '@enterprise/shared';

interface DashboardData {
  news: NewsPost[];
  assigned: KanbanCard[];
  upcoming: KanbanCard[];
}

export default function DashboardPage() {
  const auth = useAuth();
  const token = auth.user?.access_token;

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard', token),
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="terminal-cursor" style={{ color: 'var(--text-muted)' }}>loading dashboard</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <h1 className="terminal-heading terminal-cursor">dashboard</h1>

      <section>
        <h2 className="text-sm font-semibold mb-3 terminal-prompt" style={{ color: 'var(--text-secondary)' }}>
          company news
        </h2>
        {(data?.news.length ?? 0) === 0 && (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>no news yet.</p>
        )}
        <div className="space-y-2">
          {data?.news.map((post) => (
            <div
              key={post.id}
              className="p-4 transition-colors"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
              }}
            >
              {post.isPinned && (
                <span className="text-xs font-medium px-1.5 py-0.5 rounded mb-2 inline-block" style={{ background: 'var(--info-soft)', color: 'var(--info)', border: '1px solid var(--info)' }}>
                  pinned
                </span>
              )}
              <h3 className="font-medium text-sm">{post.title}</h3>
              <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{post.content}</p>
              <div className="flex items-center gap-2 mt-2">
                {post.author && (
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {(post.author as any).firstName} {(post.author as any).lastName[0]}.
                  </span>
                )}
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(post.publishedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3 terminal-prompt" style={{ color: 'var(--text-secondary)' }}>
          my tasks
        </h2>
        {(data?.assigned.length ?? 0) === 0 && (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>no tasks assigned.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {data?.assigned.map((card) => (
            <Link
              key={card.id}
              href={`/kanban/${card.boardId}`}
              className="p-4 block transition-colors"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
              }}
            >
              <h3 className="font-medium text-sm leading-snug">{card.title}</h3>
              {card.dueDate && (
                <p
                  className="text-xs mt-1.5"
                  style={{ color: new Date(card.dueDate) < new Date() ? 'var(--danger)' : 'var(--text-muted)' }}
                >
                  due {new Date(card.dueDate).toLocaleDateString()}
                </p>
              )}
            </Link>
          ))}
        </div>
      </section>

      {(data?.upcoming.length ?? 0) > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--warning)' }}>
            upcoming deadlines
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {data?.upcoming.map((card) => (
              <Link
                key={card.id}
                href={`/kanban/${card.boardId}`}
                className="p-4 block transition-colors"
                style={{
                  background: 'var(--warning-soft)',
                  border: '1px solid var(--warning)',
                  borderRadius: 'var(--radius)',
                }}
              >
                <h3 className="font-medium text-sm leading-snug">{card.title}</h3>
                <p className="text-xs mt-1.5" style={{ color: 'var(--warning)' }}>
                  due {new Date(card.dueDate!).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
