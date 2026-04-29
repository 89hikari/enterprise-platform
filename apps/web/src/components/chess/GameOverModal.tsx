import type { ChessGameOverPayload, ChessResult } from '@enterprise/shared';

interface Props {
  gameOver: ChessGameOverPayload;
  myColor: 'white' | 'black';
  onClose: () => void;
}

function resultLabel(result: ChessResult, myColor: 'white' | 'black'): string {
  if (result === 'DRAW') return 'draw';
  if ((result === 'WHITE_WIN' && myColor === 'white') || (result === 'BLACK_WIN' && myColor === 'black')) {
    return 'you won!';
  }
  return 'you lost';
}

function eloChangeLabel(change: number): string {
  if (change > 0) return `+${change}`;
  return String(change);
}

export function GameOverModal({ gameOver, myColor, onClose }: Props) {
  const isWhite = myColor === 'white';
  const myElo = isWhite ? gameOver.whiteElo : gameOver.blackElo;
  const myChange = isWhite ? gameOver.whiteEloChange : gameOver.blackEloChange;

  const result = resultLabel(gameOver.result, myColor);
  const resultColor = result === 'draw' ? 'var(--warning)' : result === 'you won!' ? 'var(--success)' : 'var(--danger)';
  const changeColor = myChange >= 0 ? 'var(--success)' : 'var(--danger)';

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-72 p-6 text-center"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)' }}
      >
        <h2 className="text-xl font-bold mb-1" style={{ color: resultColor }}>{result}</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          {gameOver.reason.toLowerCase().replace(/_/g, ' ')}
        </p>
        <div className="p-4 mb-4 rounded" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>new elo</p>
          <p className="text-2xl font-bold">{myElo}</p>
          <p className="text-xs font-medium mt-1" style={{ color: changeColor }}>
            {eloChangeLabel(myChange)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="terminal-btn terminal-btn-primary w-full text-sm py-2"
        >
          back to lobby
        </button>
      </div>
    </div>
  );
}
