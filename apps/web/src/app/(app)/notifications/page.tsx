'use client';

import { useAuth } from 'react-oidc-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { clsx } from 'clsx';
import type { Notification } from '@enterprise/shared';

export default function NotificationsPage() {
  const auth = useAuth();
  const token = auth.user?.access_token;
  const qc = useQueryClient();

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications', token),
    enabled: !!token,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notif-count'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all', {}, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notif-count'] });
    },
  });

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            Mark all as read
          </button>
        )}
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}

      {!isLoading && (notifications?.length ?? 0) === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🔔</p>
          <p>No notifications yet</p>
        </div>
      )}

      <div className="space-y-2">
        {notifications?.map((notif) => (
          <div
            key={notif.id}
            onClick={() => !notif.isRead && markRead.mutate(notif.id)}
            className={clsx(
              'p-4 rounded-xl border cursor-pointer transition-colors',
              notif.isRead
                ? 'bg-white border-gray-100 text-gray-500'
                : 'bg-blue-50 border-blue-200 hover:border-blue-300',
            )}
          >
            <div className="flex items-start gap-3">
              {!notif.isRead && (
                <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className={clsx('text-sm font-medium', notif.isRead ? 'text-gray-700' : 'text-gray-900')}>
                  {notif.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{notif.body}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(notif.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
