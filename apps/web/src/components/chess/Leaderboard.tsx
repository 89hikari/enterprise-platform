import type { ChessPlayerRank } from '@enterprise/shared';

interface Props {
  players: ChessPlayerRank[];
}

export function Leaderboard({ players }: Props) {
  if (players.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          no players yet. complete a game to appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto terminal-card">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            <th className="py-2 text-left font-medium w-10">#</th>
            <th className="py-2 text-left font-medium">player</th>
            <th className="py-2 text-right font-medium">elo</th>
            <th className="py-2 text-right font-medium">w</th>
            <th className="py-2 text-right font-medium">l</th>
            <th className="py-2 text-right font-medium">d</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.userId} className="border-b hover:opacity-80 transition-opacity" style={{ borderColor: 'var(--border)' }}>
              <td className="py-2 pl-2" style={{ color: 'var(--text-muted)' }}>{p.rank}</td>
              <td className="py-2 font-medium">{p.firstName} {p.lastName}</td>
              <td className="py-2 text-right font-semibold" style={{ color: 'var(--accent)' }}>{p.elo}</td>
              <td className="py-2 text-right" style={{ color: 'var(--success)' }}>{p.wins}</td>
              <td className="py-2 text-right" style={{ color: 'var(--danger)' }}>{p.losses}</td>
              <td className="py-2 pr-2 text-right" style={{ color: 'var(--text-muted)' }}>{p.draws}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
