'use client';

import { useEffect, useState } from 'react';

interface Props {
  timeMs: number;
  isRunning: boolean;
}

export function ChessClock({ timeMs, isRunning }: Props) {
  const [displayMs, setDisplayMs] = useState(timeMs);

  useEffect(() => {
    setDisplayMs(timeMs);
  }, [timeMs]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setDisplayMs((prev) => Math.max(0, prev - 100));
    }, 100);
    return () => clearInterval(interval);
  }, [isRunning]);

  const minutes = Math.floor(displayMs / 60_000);
  const seconds = Math.floor((displayMs % 60_000) / 1_000);
  const isLow = displayMs < 30_000;

  return (
    <span
      className="font-mono font-bold text-sm tabular-nums px-2 py-0.5 rounded"
      style={{
        background: isLow ? 'var(--danger-soft)' : 'var(--bg-surface)',
        color: isLow ? 'var(--danger)' : 'var(--text)',
        border: `1px solid ${isLow ? 'var(--danger)' : 'var(--border)'}`,
      }}
    >
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}
