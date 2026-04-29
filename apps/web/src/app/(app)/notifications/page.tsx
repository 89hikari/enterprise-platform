'use client';

import { useAuth } from 'react-oidc-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
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
        <h1 className="terminal-heading terminal-cursor">notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="terminal-btn text-xs py-1 px-3"
          >
            mark all read
          </button>
        )}
      </div>

      {isLoading && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>loading...</p>}

      {!isLoading && (notifications?.length ?? 0) === 0 && (
        <div className="text-center py-12">
          <p className="text-2xl mb-3">◉</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>no notifications</p>
        </div>
      )}

      <div className="space-y-1.5">
        {notifications?.map((notif) => (
          <div
            key={notif.id}
            onClick={() => !notif.isRead && markRead.mutate(notif.id)}
            className="p-3 cursor-pointer transition-colors"
            style={{
              background: notif.isRead ? 'var(--bg-elevated)' : 'var(--info-soft)',
              border: `1px solid ${notif.isRead ? 'var(--border)' : 'var(--info)'}`,
              borderRadius: 'var(--radius)',
            }}
          >
            <div className="flex items-start gap-3">
              {!notif.isRead && (
                <span className="w-1.5 h-1.5 rounded mt-2 shrink-0" style={{ background: 'var(--info)' }} />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{notif.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{notif.body}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
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
