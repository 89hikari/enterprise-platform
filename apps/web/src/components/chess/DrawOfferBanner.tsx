interface Props {
  onAccept: () => void;
  onDecline: () => void;
}

export function DrawOfferBanner({ onAccept, onDecline }: Props) {
  return (
    <div className="p-3 rounded" style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning)' }}>
      <p className="text-xs font-medium mb-2" style={{ color: 'var(--warning)' }}>
        opponent offered a draw
      </p>
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="terminal-btn terminal-btn-primary flex-1 text-xs py-1"
        >
          accept
        </button>
        <button
          onClick={onDecline}
          className="terminal-btn flex-1 text-xs py-1"
        >
          decline
        </button>
      </div>
    </div>
  );
}
