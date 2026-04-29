'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

interface Org { id: string; name: string; slug: string }

export function OrgTab({ token }: { token: string | undefined }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const { data: orgs } = useQuery<Org[]>({
    queryKey: ['organizations'],
    queryFn: () => api.get('/organizations', token),
    enabled: !!token,
  });

  const org = orgs?.[0];

  const update = useMutation({
    mutationFn: (newName: string) =>
      api.patch(`/organizations/${org!.id}`, { name: newName }, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
      setEditing(false);
      setError('');
    },
    onError: (e: any) => setError(e.message ?? 'Failed to update'),
  });

  if (!org) return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>loading...</p>;

  return (
    <div
      className="p-5 max-w-lg"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
    >
      <h2 className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>
        organization
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>name</label>
          {editing ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="terminal-input flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') update.mutate(name.trim());
                  if (e.key === 'Escape') setEditing(false);
                }}
              />
              <button
                onClick={() => update.mutate(name.trim())}
                disabled={!name.trim() || update.isPending}
                className="terminal-btn terminal-btn-primary text-xs"
              >
                save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="terminal-btn text-xs"
              >
                cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="font-medium">{org.name}</span>
              <button
                onClick={() => { setName(org.name); setEditing(true); }}
                className="text-xs terminal-link"
              >
                edit
              </button>
            </div>
          )}
          {error && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{error}</p>}
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>slug</label>
          <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>{org.slug}</span>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>read-only — changing the slug would break existing references.</p>
        </div>
      </div>
    </div>
  );
}
