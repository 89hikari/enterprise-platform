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
          <p className="text-3xl mb-4" style={{ color: 'var(--text-muted)' }}>⊡</p>
          <h2 className="terminal-heading mb-2">connect microsoft teams</h2>
          <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--text-muted)' }}>
            access your teams channels and send messages without leaving the app.
          </p>
          <a
            href={`${apiBase}/oauth/microsoft/authorize?product=teams`}
            className="terminal-btn terminal-btn-primary inline-block"
          >
            connect microsoft teams
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="terminal-heading terminal-cursor mb-6">teams</h1>

      {isLoading && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>loading teams...</p>}

      <div className="space-y-2">
        {teams?.map((team) => (
          <Link
            key={team.id}
            href={`/teams/${team.id}`}
            className="flex items-center gap-4 p-4 transition-colors"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
          >
            <div
              className="w-10 h-10 rounded flex items-center justify-center font-bold text-sm shrink-0"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              {team.displayName[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm">{team.displayName}</p>
              {team.description && (
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{team.description}</p>
              )}
            </div>
            <span className="ml-auto text-lg" style={{ color: 'var(--text-muted)' }}>›</span>
          </Link>
        ))}

        {teams?.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>no teams found.</p>
        )}
      </div>
    </div>
  );
}
