'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from 'react-oidc-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/lib/api-client';
import { getNotifSocket } from '@/lib/socket-client';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { href: '/users', label: 'People', icon: '👥' },
  { href: '/departments', label: 'Departments', icon: '🏢' },
  { href: '/chat', label: 'Chat', icon: '💬' },
  { href: '/kanban', label: 'Kanban', icon: '📋' },
  { href: '/outlook', label: 'Outlook', icon: '📧' },
  { href: '/teams', label: 'Teams', icon: '🤝' },
];

export function Sidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const token = auth.user?.access_token;
  const qc = useQueryClient();

  // Initial count from REST
  const { data: notifCount } = useQuery<{ count: number }>({
    queryKey: ['notif-count'],
    queryFn: () => api.get('/notifications/count', token),
    enabled: !!token,
    refetchInterval: 60_000,
  });

  // Real-time count updates via Socket.IO
  useEffect(() => {
    if (!token) return;
    const socket = getNotifSocket(token);

    const onCount = (data: { count: number }) => {
      qc.setQueryData(['notif-count'], data);
    };
    const onNotification = () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('unread_count', onCount);
    socket.on('notification', onNotification);

    return () => {
      socket.off('unread_count', onCount);
      socket.off('notification', onNotification);
    };
  }, [token, qc]);

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-gray-100">
        <span className="font-bold text-blue-600 text-lg">
          {process.env.NEXT_PUBLIC_APP_NAME || 'Enterprise'}
        </span>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
        {(() => {
          const roles = (auth.user?.profile as any)?.roles as string[] | undefined;
          if (!roles?.some((r) => r === 'superadmin' || r === 'admin')) return null;
          return (
            <Link
              href="/admin"
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                pathname.startsWith('/admin')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <span>⚙️</span>
              Admin
            </Link>
          );
        })()}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <Link
          href="/notifications"
          className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-50 text-sm text-gray-600 mb-1"
        >
          <span>🔔</span>
          <span>Notifications</span>
          {(notifCount?.count ?? 0) > 0 && (
            <span className="ml-auto bg-red-500 text-white text-xs rounded-full min-w-[1.1rem] h-[1.1rem] flex items-center justify-center px-1 font-bold">
              {notifCount!.count > 99 ? '99+' : notifCount!.count}
            </span>
          )}
        </Link>
        <Link
          href={`/profile/${auth.user?.profile.sub}`}
          className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-50 text-sm text-gray-700"
        >
          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
            {auth.user?.profile.given_name?.[0] ?? '?'}
          </div>
          <span className="truncate">{auth.user?.profile.given_name ?? 'Profile'}</span>
        </Link>
        <button
          onClick={() => auth.signoutRedirect()}
          className="mt-1 w-full text-left px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 rounded"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
