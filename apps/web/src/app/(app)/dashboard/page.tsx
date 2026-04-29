'use client';

import { useAuth } from 'react-oidc-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import Link from 'next/link';
import { clsx } from 'clsx';
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
        <div className="text-gray-400">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Company News */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Company News</h2>
        {(data?.news.length ?? 0) === 0 && (
          <p className="text-gray-400 text-sm">No news yet.</p>
        )}
        <div className="space-y-3">
          {data?.news.map((post) => (
            <div key={post.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-200 transition-colors">
              {post.isPinned && (
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded mb-2 inline-block">
                  Pinned
                </span>
              )}
              <h3 className="font-semibold text-gray-900">{post.title}</h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{post.content}</p>
              <div className="flex items-center gap-2 mt-2">
                {post.author && (
                  <span className="text-xs text-gray-400">
                    {(post.author as any).firstName} {(post.author as any).lastName}
                  </span>
                )}
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-gray-400">
                  {new Date(post.publishedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Assigned Tasks */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">My Tasks</h2>
        {(data?.assigned.length ?? 0) === 0 && (
          <p className="text-gray-400 text-sm">No tasks assigned to you.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data?.assigned.map((card) => (
            <Link
              key={card.id}
              href={`/kanban/${card.boardId}`}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all block"
            >
              <h3 className="font-medium text-gray-900 text-sm leading-snug">{card.title}</h3>
              {card.dueDate && (
                <p className={clsx(
                  'text-xs mt-1.5',
                  new Date(card.dueDate) < new Date() ? 'text-red-500' : 'text-gray-400',
                )}>
                  Due {new Date(card.dueDate).toLocaleDateString()}
                </p>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Upcoming Deadlines */}
      {(data?.upcoming.length ?? 0) > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-yellow-700 mb-4">Upcoming Deadlines</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data?.upcoming.map((card) => (
              <Link
                key={card.id}
                href={`/kanban/${card.boardId}`}
                className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 hover:border-yellow-400 transition-colors block"
              >
                <h3 className="font-medium text-gray-900 text-sm leading-snug">{card.title}</h3>
                <p className="text-xs text-yellow-700 mt-1.5">
                  Due {new Date(card.dueDate!).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
