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
        <h1 className="text-2xl font-bold text-gray-900">People</h1>
        <input
          type="search"
          placeholder="Search by name, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isLoading && <p className="text-gray-400">Loading...</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.data.map((user) => (
          <a
            key={user.id}
            href={`/profile/${user.id}`}
            className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3 hover:border-blue-300 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
              {user.photoUrl ? (
                <img src={user.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                `${user.firstName[0]}${user.lastName[0]}`
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">
                {user.lastName} {user.firstName}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.positionName ?? user.role}</p>
            </div>
          </a>
        ))}
      </div>

      {data && data.total === 0 && (
        <p className="text-center text-gray-400 mt-12">No users found.</p>
      )}
    </div>
  );
}
