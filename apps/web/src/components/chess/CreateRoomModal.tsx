'use client';

import { useState } from 'react';

interface Props {
  onSubmit: (name: string, timeControl: number | null) => Promise<void>;
  onClose: () => void;
  loading?: boolean;
  error?: string | null;
}

const TIME_OPTIONS: { label: string; value: number | null }[] = [
  { label: '--:--', value: null },
  { label: '1m', value: 60 },
  { label: '5m', value: 300 },
  { label: '10m', value: 600 },
];

export function CreateRoomModal({ onSubmit, onClose, loading, error }: Props) {
  const [name, setName] = useState('');
  const [timeControl, setTimeControl] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit(name.trim(), timeControl);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-full max-w-sm p-5"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="terminal-heading text-base">new room</h2>
          <button onClick={onClose} className="text-xs terminal-btn py-0.5 px-2">
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-3 text-xs px-3 py-2 rounded" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
              name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="terminal-input w-full"
              placeholder="quick game"
              maxLength={100}
              required
              autoFocus
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
              time control
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setTimeControl(opt.value)}
                  disabled={loading}
                  className="py-1.5 rounded text-xs font-medium border transition-colors"
                  style={{
                    background: timeControl === opt.value ? 'var(--accent-soft)' : 'var(--bg)',
                    color: timeControl === opt.value ? 'var(--accent)' : 'var(--text-secondary)',
                    borderColor: timeControl === opt.value ? 'var(--accent)' : 'var(--border)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="terminal-btn flex-1 text-xs py-1.5"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="terminal-btn terminal-btn-primary flex-1 text-xs py-1.5"
            >
              {loading ? 'creating...' : 'create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
