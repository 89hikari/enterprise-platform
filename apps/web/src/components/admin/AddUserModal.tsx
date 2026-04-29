'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

interface Dept { id: string; name: string; parentDepartmentId: string | null }
interface Org { id: string }

interface Props {
  token: string | undefined;
  onSuccess: () => void;
  onClose: () => void;
}

const ROLES = ['employee', 'manager', 'hr_manager', 'admin', 'superadmin'] as const;

export function AddUserModal({ token, onSuccess, onClose }: Props) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    role: 'employee', departmentId: '', positionName: '', password: '',
  });
  const [error, setError] = useState('');

  const { data: orgs } = useQuery<Org[]>({
    queryKey: ['organizations'],
    queryFn: () => api.get('/organizations', token),
    enabled: !!token,
  });

  const { data: departments = [] } = useQuery<Dept[]>({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments', token),
    enabled: !!token,
  });

  const orgId = orgs?.[0]?.id ?? '';

  const create = useMutation({
    mutationFn: () =>
      api.post('/users', {
        ...form,
        organizationId: orgId,
        departmentId: form.departmentId || undefined,
        positionName: form.positionName || undefined,
      }, token),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setError(e.message ?? 'Failed to create user'),
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const valid = form.firstName && form.lastName && form.email &&
    form.password.length >= 8 && orgId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md p-5"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="terminal-heading text-base">add user</h2>
          <button onClick={onClose} className="text-xs terminal-btn py-0.5 px-2">✕</button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>first name *</label>
              <input
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                className="terminal-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>last name *</label>
              <input
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                className="terminal-input w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className="terminal-input w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>role *</label>
              <select
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
                className="terminal-input w-full"
                style={{ appearance: 'auto' }}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>department</label>
              <select
                value={form.departmentId}
                onChange={(e) => set('departmentId', e.target.value)}
                className="terminal-input w-full"
                style={{ appearance: 'auto' }}
              >
                <option value="">— none —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>position</label>
            <input
              value={form.positionName}
              onChange={(e) => set('positionName', e.target.value)}
              className="terminal-input w-full"
              placeholder="e.g. Software Engineer"
            />
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>temporary password * (min 8 chars)</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              className="terminal-input w-full"
            />
          </div>
        </div>

        {error && <p className="text-sm mt-3" style={{ color: 'var(--danger)' }}>{error}</p>}

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="terminal-btn text-xs">
            cancel
          </button>
          <button
            onClick={() => create.mutate()}
            disabled={!valid || create.isPending}
            className="terminal-btn terminal-btn-primary text-xs"
          >
            {create.isPending ? 'creating...' : 'create'}
          </button>
        </div>
      </div>
    </div>
  );
}
