export function calculateElo(
  myElo: number,
  opponentElo: number,
  score: 0 | 0.5 | 1,
): number {
  const k = myElo < 2100 ? 32 : myElo < 2400 ? 24 : 16;
  const expected = 1 / (1 + Math.pow(10, (opponentElo - myElo) / 400));
  const newElo = Math.round(myElo + k * (score - expected));
  return Math.max(100, newElo);
}

export function deductClock(remainingMs: number, elapsedMs: number): number {
  return Math.max(0, remainingMs - elapsedMs);
}
