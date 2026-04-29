'use client';

import { use, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { KanbanBoardView } from '@/components/kanban/KanbanBoardView';

export default function KanbanBoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = use(params);
  const auth = useAuth();
  const token = auth.user?.access_token;

  const { data: board, isLoading } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => api.get<any>(`/kanban/boards/${boardId}`, token),
    enabled: !!token && !!boardId,
  });

  if (isLoading) return <div className="p-6 text-gray-400">Loading board...</div>;
  if (!board) return <div className="p-6 text-gray-400">Board not found.</div>;

  return <KanbanBoardView board={board} token={token} />;
}
