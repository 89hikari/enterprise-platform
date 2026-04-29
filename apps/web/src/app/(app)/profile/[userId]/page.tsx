'use client';

import { use, useRef, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { UserWithRelations, WorkHistory } from '@enterprise/shared';

export default function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const auth = useAuth();
  const token = auth.user?.access_token;
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const isOwnProfile = auth.user?.profile.sub === userId;

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.get<UserWithRelations>(`/users/${userId}`, token),
    enabled: !!token && !!userId,
  });

  const { data: history } = useQuery({
    queryKey: ['work-history', userId],
    queryFn: () => api.get<WorkHistory[]>(`/users/${userId}/work-history`, token),
    enabled: !!token && !!userId,
  });

  const updatePhoto = useMutation({
    mutationFn: (photoUrl: string) => api.patch(`/users/${userId}`, { photoUrl }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user', userId] }),
  });

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { uploadUrl, key } = await api.post<{ uploadUrl: string; key: string }>(
        '/files/presign/upload',
        { bucket: 'avatars', fileName: file.name, contentType: file.type },
        token,
      );
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      const { downloadUrl } = await api.get<{ downloadUrl: string }>(
        `/files/presign/download/avatars/${encodeURIComponent(key)}`,
        token,
      );
      await updatePhoto.mutateAsync(downloadUrl);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (isLoading) return <div className="p-6" style={{ color: 'var(--text-muted)' }}>loading...</div>;
  if (!user) return <div className="p-6" style={{ color: 'var(--text-muted)' }}>user not found.</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-6">
        <div className="relative shrink-0">
          <div
            className="w-20 h-20 rounded flex items-center justify-center text-2xl font-bold overflow-hidden"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            {user.photoUrl ? (
              <img src={user.photoUrl} alt="" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              `${user.firstName[0]}${user.lastName[0]}`
            )}
          </div>
          {isOwnProfile && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded flex items-center justify-center text-xs shadow-md disabled:opacity-50 transition-colors"
                style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                title="Change photo"
              >
                {uploading ? '…' : '✎'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </>
          )}
        </div>
        <div>
          <h1 className="terminal-heading">
            {user.lastName} {user.firstName} {user.middleName}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user.positionName}</p>
          <span className="mt-1 inline-block text-xs font-medium px-2 py-0.5 rounded" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
            {user.role}
          </span>
        </div>
      </div>

      <div
        className="p-5 grid grid-cols-2 gap-4 text-sm"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
      >
        <div>
          <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>email</p>
          <p>{user.email}</p>
        </div>
        {user.phone && (
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>phone</p>
            <p>{user.phone}</p>
          </div>
        )}
        {user.department && (
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>department</p>
            <p>{user.department.name}</p>
          </div>
        )}
        {(user.managers?.length ?? 0) > 0 && (
          <div className="col-span-2">
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>managers</p>
            <div className="flex flex-wrap gap-2">
              {user.managers.map((m) => (
                <a
                  key={m.id}
                  href={`/profile/${m.id}`}
                  className="terminal-link text-sm"
                >
                  {m.lastName} {m.firstName[0]}.
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {history && history.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-4 terminal-prompt" style={{ color: 'var(--text-secondary)' }}>
            work history
          </h2>
          <ol className="ml-3 space-y-4" style={{ borderLeft: '1px solid var(--border)' }}>
            {history.map((event) => (
              <li key={event.id} className="ml-5">
                <span className="absolute -left-1.5 mt-1.5 h-2.5 w-2.5 rounded-full" style={{ background: 'var(--accent)' }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(event.effectiveDate).toLocaleDateString()}
                </p>
                <p className="font-medium text-sm">{event.eventType}</p>
                {event.toPosition && (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>→ {event.toPosition}</p>
                )}
                {event.notes && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{event.notes}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
