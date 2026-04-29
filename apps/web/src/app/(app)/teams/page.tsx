'use client';

import { useAuth } from 'react-oidc-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import Link from 'next/link';

interface Team { id: string; displayName: string; description: string | null }
interface TeamsStatus { connected: boolean }

export default function TeamsPage() {
  const auth = useAuth();
  const token = auth.user?.access_token;
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '/api';

  const { data: status } = useQuery<TeamsStatus>({
    queryKey: ['teams-status'],
    queryFn: () => api.get('/teams/status', token),
    enabled: !!token,
  });

  const { data: teams, isLoading } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: () => api.get('/teams', token),
    enabled: !!token && !!status?.connected,
  });

  if (!status?.connected) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-center">
          <p className="text-5xl mb-4">🤝</p>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Connect Microsoft Teams</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-xs">
            Access your Teams channels and send messages without leaving the app.
          </p>
          <a
            href={`${apiBase}/oauth/microsoft/authorize?product=teams`}
            className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Connect Microsoft Teams
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Teams</h1>

      {isLoading && <p className="text-gray-400 text-sm">Loading teams…</p>}

      <div className="space-y-3">
        {teams?.map((team) => (
          <Link
            key={team.id}
            href={`/teams/${team.id}`}
            className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {team.displayName[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{team.displayName}</p>
              {team.description && (
                <p className="text-xs text-gray-400 truncate mt-0.5">{team.description}</p>
              )}
            </div>
            <span className="ml-auto text-gray-300 text-lg">›</span>
          </Link>
        ))}

        {teams?.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">No teams found.</p>
        )}
      </div>
    </div>
  );
}
