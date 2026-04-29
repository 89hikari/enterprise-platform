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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Add User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">First name *</label>
              <input
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Last name *</label>
              <input
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Role *</label>
              <select
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Department</label>
              <select
                value={form.departmentId}
                onChange={(e) => set('departmentId', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                <option value="">— None —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Position</label>
            <input
              value={form.positionName}
              onChange={(e) => set('positionName', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="e.g. Software Engineer"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Temporary password * (min 8 chars)</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 px-3">
            Cancel
          </button>
          <button
            onClick={() => create.mutate()}
            disabled={!valid || create.isPending}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {create.isPending ? 'Creating…' : 'Create user'}
          </button>
        </div>
      </div>
    </div>
  );
}
