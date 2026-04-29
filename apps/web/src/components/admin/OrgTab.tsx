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

  if (!org) return <p className="text-gray-400">Loading…</p>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-lg">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Organization
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Name</label>
          {editing ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') update.mutate(name.trim());
                  if (e.key === 'Escape') setEditing(false);
                }}
              />
              <button
                onClick={() => update.mutate(name.trim())}
                disabled={!name.trim() || update.isPending}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-sm text-gray-400 hover:text-gray-600 px-2"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-gray-900 font-medium">{org.name}</span>
              <button
                onClick={() => { setName(org.name); setEditing(true); }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Edit
              </button>
            </div>
          )}
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Slug</label>
          <span className="text-gray-500 text-sm font-mono">{org.slug}</span>
          <p className="text-xs text-gray-400 mt-0.5">Read-only — changing the slug would break existing references.</p>
        </div>
      </div>
    </div>
  );
}
