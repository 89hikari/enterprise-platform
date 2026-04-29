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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Departments</h1>
      {isLoading && <p className="text-gray-400">Loading...</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.map((dept) => (
          <div key={dept.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900">{dept.name}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
