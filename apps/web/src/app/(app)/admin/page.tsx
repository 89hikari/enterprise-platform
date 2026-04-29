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
      <div className="p-6 text-gray-400">
        You do not have permission to access this page.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin</h1>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              tab === t
                ? 'bg-white border border-b-white border-gray-200 text-blue-700 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Organization' && <OrgTab token={token} />}
      {tab === 'Departments' && <DepartmentsTab token={token} />}
      {tab === 'Users' && <UsersTab token={token} />}
    </div>
  );
}
