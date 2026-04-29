'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from 'react-oidc-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/lib/api-client';
import { getNotifSocket } from '@/lib/socket-client';
import { ThemeToggle } from './ThemeToggle';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { href: '/users', label: 'People', icon: '👤' },
  { href: '/departments', label: 'Departments', icon: '▦' },
  { href: '/chat', label: 'Chat', icon: '◈' },
  { href: '/kanban', label: 'Kanban', icon: '▤' },
  { href: '/chess', label: 'Chess', icon: '♟' },
  { href: '/outlook', label: 'Outlook', icon: '✉' },
  { href: '/teams', label: 'Teams', icon: '⊡' },
];

export function Sidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const token = auth.user?.access_token;
  const qc = useQueryClient();

  const { data: notifCount } = useQuery<{ count: number }>({
    queryKey: ['notif-count'],
    queryFn: () => api.get('/notifications/count', token),
    enabled: !!token,
    refetchInterval: 60_000,
  });

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
    <aside className="w-56 flex flex-col h-full shrink-0 border-r" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
      <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>
          ~/{process.env.NEXT_PUBLIC_APP_NAME || 'enterprise'}
        </span>
      </div>

      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-2.5 px-2.5 py-1.5 rounded text-sm transition-colors',
              pathname.startsWith(item.href)
                ? 'font-medium'
                : 'hover:opacity-80',
            )}
            style={
              pathname.startsWith(item.href)
                ? { background: 'var(--accent-soft)', color: 'var(--accent)' }
                : { color: 'var(--text-secondary)' }
            }
          >
            <span className="text-xs w-4 text-center">{item.icon}</span>
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
                'flex items-center gap-2.5 px-2.5 py-1.5 rounded text-sm transition-colors',
                pathname.startsWith('/admin') ? 'font-medium' : 'hover:opacity-80',
              )}
              style={
                pathname.startsWith('/admin')
                  ? { background: 'var(--accent-soft)', color: 'var(--accent)' }
                  : { color: 'var(--text-secondary)' }
              }
            >
              <span className="text-xs w-4 text-center">⚙</span>
              Admin
            </Link>
          );
        })()}
      </nav>

      <div className="p-2 border-t space-y-1" style={{ borderColor: 'var(--border)' }}>
        <Link
          href="/notifications"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span className="text-xs">◉</span>
          <span>Notifications</span>
          {(notifCount?.count ?? 0) > 0 && (
            <span className="ml-auto text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
              {notifCount!.count > 99 ? '99+' : notifCount!.count}
            </span>
          )}
        </Link>
        <Link
          href={`/profile/${auth.user?.profile.sub}`}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--text)' }}
        >
          <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            {auth.user?.profile.given_name?.[0] ?? '?'}
          </div>
          <span className="truncate">{auth.user?.profile.given_name ?? 'Profile'}</span>
        </Link>
        <div className="px-2.5 py-1">
          <ThemeToggle />
        </div>
        <button
          onClick={() => auth.signoutRedirect()}
          className="w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
        >
          signout
        </button>
      </div>
    </aside>
  );
}
