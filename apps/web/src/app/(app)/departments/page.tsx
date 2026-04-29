'use client';

import { useAuth } from 'react-oidc-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Department } from '@enterprise/shared';

export default function DepartmentsPage() {
  const auth = useAuth();
  const token = auth.user?.access_token;

  const { data, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get<Department[]>('/departments', token),
    enabled: !!token,
  });

  return (
    <div className="p-6">
      <h1 className="terminal-heading terminal-cursor mb-6">departments</h1>
      {isLoading && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>loading...</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {data?.map((dept) => (
          <div
            key={dept.id}
            className="p-4"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
          >
            <h3 className="font-medium text-sm">▦ {dept.name}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
