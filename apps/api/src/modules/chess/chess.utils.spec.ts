import { calculateElo, deductClock } from './chess.utils';

describe('calculateElo', () => {
  it('increases elo for a win against equal opponent', () => {
    expect(calculateElo(1200, 1200, 1)).toBe(1216);
  });

  it('decreases elo for a loss against equal opponent', () => {
    expect(calculateElo(1200, 1200, 0)).toBe(1184);
  });

  it('does not change elo for a draw against equal opponent', () => {
    expect(calculateElo(1200, 1200, 0.5)).toBe(1200);
  });

  it('uses K=32 for elo below 2100', () => {
    // 1200 + 32 * (1 - 0.5) = 1216
    expect(calculateElo(1200, 1200, 1)).toBe(1216);
  });

  it('uses K=24 for elo between 2100 and 2400', () => {
    // 2200 + 24 * (1 - 0.5) = 2212
    expect(calculateElo(2200, 2200, 1)).toBe(2212);
  });

  it('uses K=16 for elo above 2400', () => {
    // 2500 + 16 * (1 - 0.5) = 2508
    expect(calculateElo(2500, 2500, 1)).toBe(2508);
  });

  it('floors elo at 100 and never goes negative', () => {
    expect(calculateElo(100, 2800, 0)).toBe(100);
  });

  it('gives more points for beating a stronger opponent', () => {
    const vsWeaker = calculateElo(1200, 1000, 1);
    const vsStronger = calculateElo(1200, 1400, 1);
    expect(vsStronger).toBeGreaterThan(vsWeaker);
  });
});

describe('deductClock', () => {
  it('subtracts elapsed time from remaining time', () => {
    expect(deductClock(60000, 5000)).toBe(55000);
  });

  it('returns 0 when elapsed exceeds remaining', () => {
    expect(deductClock(1000, 5000)).toBe(0);
  });

  it('returns remaining unchanged when elapsed is 0', () => {
    expect(deductClock(30000, 0)).toBe(30000);
  });
});
