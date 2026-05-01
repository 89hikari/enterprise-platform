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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="terminal-heading terminal-cursor">kanban</h1>
        <button
          onClick={() => setCreating(true)}
          className="terminal-btn terminal-btn-primary text-sm"
        >
          <span>+</span>
          new board
        </button>
      </div>

      {creating && (
        <div
          className="mb-6 p-4"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
        >
          <p className="font-medium text-sm mb-3">create board</p>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="board name"
            className="terminal-input w-full mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={() => createBoard.mutate({ name })}
              disabled={!name.trim() || createBoard.isPending}
              className="terminal-btn terminal-btn-primary text-sm px-4 py-1.5"
            >
              create
            </button>
            <button onClick={() => setCreating(false)} className="terminal-btn text-sm px-3 py-1.5">
              cancel
            </button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>loading...</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {boards.map((board) => (
          <Link
            key={board.id}
            href={`/kanban/${board.id}`}
            className="p-5 transition-colors terminal-card"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
          >
            <h3 className="font-semibold text-sm mb-1">▤ {board.name}</h3>
            {board.description && <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{board.description}</p>}
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{board._count.cards} card{board._count.cards !== 1 ? 's' : ''}</p>
          </Link>
        ))}
        {!isLoading && boards.length === 0 && (
          <p className="col-span-3 text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>no boards yet. create one!</p>
        )}
      </div>
    </div>
  );
}
