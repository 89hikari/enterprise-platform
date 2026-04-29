'use client';

import { useAuth } from 'react-oidc-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { PaginatedResponse, User } from '@enterprise/shared';
import { useState } from 'react';

export default function UsersPage() {
  const auth = useAuth();
  const token = auth.user?.access_token;
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () =>
      api.get<PaginatedResponse<User>>(`/users?search=${encodeURIComponent(search)}&limit=50`, token),
    enabled: !!token,
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="terminal-heading terminal-cursor">people</h1>
        <input
          type="search"
          placeholder="search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="terminal-input w-56"
        />
      </div>

      {isLoading && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>loading...</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {data?.data.map((user) => (
          <a
            key={user.id}
            href={`/profile/${user.id}`}
            className="p-3 flex items-center gap-3 transition-colors"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
            }}
          >
            <div
              className="w-9 h-9 rounded flex items-center justify-center font-bold text-xs shrink-0"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              {user.photoUrl ? (
                <img src={user.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                `${user.firstName[0]}${user.lastName[0]}`
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{user.lastName} {user.firstName[0]}.</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user.positionName ?? user.role}</p>
            </div>
          </a>
        ))}
      </div>

      {data && data.total === 0 && (
        <p className="text-center mt-12 text-sm" style={{ color: 'var(--text-muted)' }}>no users found.</p>
      )}
    </div>
  );
}
