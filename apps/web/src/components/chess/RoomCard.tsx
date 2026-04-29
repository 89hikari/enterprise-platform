import Link from 'next/link';
import type { ChessRoomSummary } from '@enterprise/shared';

interface Props {
  room: ChessRoomSummary;
  onJoin: (roomId: string) => void;
  onCancel?: (roomId: string) => void;
  currentUserId: string;
}

function formatTime(seconds: number | null): string {
  if (seconds === null) return '--:--';
  if (seconds < 60) return `${seconds}s`;
  return `${seconds / 60}m`;
}

function statusLabel(status: string): string {
  if (status === 'WAITING') return '○ waiting';
  if (status === 'ACTIVE') return '● active';
  return '─ finished';
}

export function RoomCard({ room, onJoin, onCancel, currentUserId }: Props) {
  const isCreator = room.creator.id === currentUserId;
  const isWaiting = room.status === 'WAITING';
  const isActive = room.status === 'ACTIVE';

  return (
    <div
      className="flex items-center justify-between p-3 transition-colors"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
      }}
    >
      <div className="flex-1 min-w-0">
        <Link href={`/chess/${room.id}`} className="text-sm font-medium terminal-link">
          {room.name}
        </Link>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {room.creator.firstName} {room.creator.lastName[0]}. &middot; {formatTime(room.timeControl)} &middot;{' '}
          <span style={{ color: isWaiting ? 'var(--warning)' : 'var(--accent)' }}>
            {statusLabel(room.status)}
          </span>
        </p>
      </div>
      <div className="flex items-center gap-2 ml-4 shrink-0">
        {isWaiting && !isCreator && (
          <button
            onClick={() => onJoin(room.id)}
            className="terminal-btn terminal-btn-primary text-xs py-1 px-3"
          >
            join
          </button>
        )}
        {isWaiting && isCreator && (
          <div className="flex items-center gap-2">
            <Link
              href={`/chess/${room.id}`}
              className="terminal-btn terminal-btn-primary text-xs py-1 px-3"
            >
              enter
            </Link>
            {onCancel && (
              <button
                onClick={() => onCancel(room.id)}
                className="terminal-btn text-xs py-1 px-3"
              >
                cancel
              </button>
            )}
          </div>
        )}
        {isActive && (
          <Link
            href={`/chess/${room.id}`}
            className="terminal-btn terminal-btn-primary text-xs py-1 px-3"
          >
            play
          </Link>
        )}
      </div>
    </div>
  );
}
