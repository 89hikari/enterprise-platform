'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AddUserModal } from './AddUserModal';
import type { PaginatedResponse, User } from '@enterprise/shared';

export function UsersTab({ token }: { token: string | undefined }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () =>
      api.get<PaginatedResponse<User>>(
        `/users?search=${encodeURIComponent(search)}&limit=50`,
        token,
      ),
    enabled: !!token,
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/deactivate`, {}, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
    superadmin: { bg: 'var(--danger-soft)', text: 'var(--danger)' },
    admin: { bg: 'var(--info-soft)', text: 'var(--info)' },
    manager: { bg: 'var(--success-soft)', text: 'var(--success)' },
    hr_manager: { bg: 'var(--warning-soft)', text: 'var(--warning)' },
    employee: { bg: 'var(--bg-surface)', text: 'var(--text-secondary)' },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <input
          type="search"
          placeholder="search name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="terminal-input w-56"
        />
        <button
          onClick={() => setShowModal(true)}
          className="terminal-btn terminal-btn-primary text-sm"
        >
          <span>+</span>
          add user
        </button>
      </div>

      {isLoading && <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>loading...</p>}

      <div className="overflow-hidden" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
              <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wide">name</th>
              <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wide">email</th>
              <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wide">role</th>
              <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wide">status</th>
              <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wide"></th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((user, i) => (
              <tr key={user.id} className="hover:opacity-80 transition-opacity" style={{ borderBottom: i < (data?.data.length ?? 0) - 1 ? '1px solid var(--border)' : 'none' }}>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                    >
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <span className="font-medium">{user.firstName} {user.lastName}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                <td className="px-4 py-2.5">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      background: ROLE_COLORS[user.role]?.bg ?? 'var(--bg-surface)',
                      color: ROLE_COLORS[user.role]?.text ?? 'var(--text-secondary)',
                      border: `1px solid ${ROLE_COLORS[user.role]?.text ?? 'var(--border)'}`,
                    }}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs font-medium" style={{ color: user.isActive ? 'var(--success)' : 'var(--text-muted)' }}>
                    {user.isActive ? 'active' : 'inactive'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  {user.isActive && (
                    <button
                      onClick={() => {
                        if (confirm(`Deactivate ${user.firstName} ${user.lastName}?`))
                          deactivate.mutate(user.id);
                      }}
                      className="text-xs hover:opacity-70"
                      style={{ color: 'var(--danger)' }}
                    >
                      deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.total === 0 && (
          <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>no users found.</p>
        )}
      </div>

      {showModal && (
        <AddUserModal
          token={token}
          onClose={() => setShowModal(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['admin-users'] })}
        />
      )}
    </div>
  );
}
