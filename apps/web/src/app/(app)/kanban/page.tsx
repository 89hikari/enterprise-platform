'use client';

import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import Link from 'next/link';

interface Board { id: string; name: string; description: string | null; _count: { cards: number } }

export default function KanbanListPage() {
  const auth = useAuth();
  const token = auth.user?.access_token;
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: () => api.get<Board[]>('/kanban/boards', token),
    enabled: !!token,
  });

  const createBoard = useMutation({
    mutationFn: (data: { name: string }) =>
      api.post('/kanban/boards', data, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boards'] });
      setCreating(false);
      setName('');
    },
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kanban Boards</h1>
        <button
          onClick={() => setCreating(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + New Board
        </button>
      </div>

      {creating && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4">
          <p className="font-medium text-gray-800 mb-3">Create board</p>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Board name"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={() => createBoard.mutate({ name })}
              disabled={!name.trim() || createBoard.isPending}
              className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Create
            </button>
            <button onClick={() => setCreating(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3">
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-gray-400">Loading...</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {boards.map((board) => (
          <Link
            key={board.id}
            href={`/kanban/${board.id}`}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <h3 className="font-semibold text-gray-900 mb-1">{board.name}</h3>
            {board.description && <p className="text-sm text-gray-500 mb-2">{board.description}</p>}
            <p className="text-xs text-gray-400">{board._count.cards} card{board._count.cards !== 1 ? 's' : ''}</p>
          </Link>
        ))}
        {!isLoading && boards.length === 0 && (
          <p className="text-gray-400 col-span-3 text-center py-12">No boards yet. Create one!</p>
        )}
      </div>
    </div>
  );
}
