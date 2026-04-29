'use client';

import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { OrgTab } from '@/components/admin/OrgTab';
import { DepartmentsTab } from '@/components/admin/DepartmentsTab';
import { UsersTab } from '@/components/admin/UsersTab';

const TABS = ['Organization', 'Departments', 'Users'] as const;
type Tab = typeof TABS[number];

export default function AdminPage() {
  const auth = useAuth();
  const roles = (auth.user?.profile as any)?.roles as string[] | undefined;
  const isAdmin = roles?.some((r) => r === 'superadmin' || r === 'admin');
  const [tab, setTab] = useState<Tab>('Organization');
  const token = auth.user?.access_token;

  if (!isAdmin) {
    return (
      <div className="p-6" style={{ color: 'var(--text-muted)' }}>
        access denied. insufficient permissions.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="terminal-heading terminal-cursor mb-6">admin</h1>

      <div className="flex gap-0 mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px"
            style={{
              borderColor: tab === t ? 'var(--accent)' : 'transparent',
              color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            {t.toLowerCase()}
          </button>
        ))}
      </div>

      {tab === 'Organization' && <OrgTab token={token} />}
      {tab === 'Departments' && <DepartmentsTab token={token} />}
      {tab === 'Users' && <UsersTab token={token} />}
    </div>
  );
}
