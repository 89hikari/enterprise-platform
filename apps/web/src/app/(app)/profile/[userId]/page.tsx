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

  if (isLoading) return <div className="p-6 text-gray-400">Loading...</div>;
  if (!user) return <div className="p-6 text-gray-400">User not found.</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-6">
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-2xl font-bold overflow-hidden">
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
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center text-xs shadow-md disabled:opacity-50 transition-colors"
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
          <h1 className="text-2xl font-bold text-gray-900">
            {user.lastName} {user.firstName} {user.middleName}
          </h1>
          <p className="text-gray-500">{user.positionName}</p>
          <span className="mt-1 inline-block text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
            {user.role}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-400 text-xs">Email</p>
          <p className="text-gray-800">{user.email}</p>
        </div>
        {user.phone && (
          <div>
            <p className="text-gray-400 text-xs">Phone</p>
            <p className="text-gray-800">{user.phone}</p>
          </div>
        )}
        {user.department && (
          <div>
            <p className="text-gray-400 text-xs">Department</p>
            <p className="text-gray-800">{user.department.name}</p>
          </div>
        )}
        {(user.managers?.length ?? 0) > 0 && (
          <div className="col-span-2">
            <p className="text-gray-400 text-xs mb-1">Managers</p>
            <div className="flex flex-wrap gap-2">
              {user.managers.map((m) => (
                <a
                  key={m.id}
                  href={`/profile/${m.id}`}
                  className="text-blue-600 hover:underline text-sm"
                >
                  {m.lastName} {m.firstName}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Work History */}
      {history && history.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Work History</h2>
          <ol className="relative border-l border-gray-200 ml-3 space-y-6">
            {history.map((event) => (
              <li key={event.id} className="ml-5">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-400" />
                <p className="text-xs text-gray-400">
                  {new Date(event.effectiveDate).toLocaleDateString()}
                </p>
                <p className="font-medium text-gray-900 text-sm">{event.eventType}</p>
                {event.toPosition && (
                  <p className="text-sm text-gray-500">→ {event.toPosition}</p>
                )}
                {event.notes && <p className="text-xs text-gray-400 mt-0.5">{event.notes}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
