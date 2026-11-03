import { gamePulse, lateness, leaderOf, isFollowedGame, teamKey } from './gamePulse';

const NOW = 1793556000000;

const game = (overrides) => ({
  id: '1',
  league: 'nfl',
  start: NOW - 3 * 60 * 60 * 1000,
  status: 'live',
  period: 4,
  clockSec: 120,
  teams: [
    { abbr: 'BAL', name: 'Baltimore Ravens', score: '17' },
    { abbr: 'BUF', name: 'Buffalo Bills', score: '20' }
  ],
  favorite: 'BUF',
  situation: null,
  ...overrides
});

describe('lateness', () => {
  it('counts down periods for US sports', () => {
    expect(lateness(game({ period: 1, clockSec: 900 }))).toBe(0);
    expect(lateness(game({ period: 3, clockSec: 900 }))).toBe(0.5);
    expect(lateness(game({ period: 4, clockSec: 0 }))).toBe(1);
  });

  it('counts up for soccer and treats overtime as late', () => {
    expect(lateness(game({ league: 'pl', period: 2, clockSec: 4050 }))).toBe(0.75);
    expect(lateness(game({ period: 5, clockSec: 300 }))).toBe(1);
  });

  it('is 0 when the feed has no clock', () => {
    expect(lateness(game({ period: null, clockSec: null }))).toBe(0);
  });
});

describe('gamePulse', () => {
  it('rates a one-score game late above a blowout', () => {
    const close = gamePulse(game(), { now: NOW });
    const blowout = gamePulse(game({ teams: [{ abbr: 'BAL', score: '3' }, { abbr: 'BUF', score: '38' }] }), { now: NOW });

    expect(close.score).toBeGreaterThan(70);
    expect(close.closeAndLate).toBe(true);
    expect(blowout.score).toBe(0);
  });

  it('rates a tie late above a tie early', () => {
    const tied = [{ abbr: 'BAL', score: '10' }, { abbr: 'BUF', score: '10' }];

    expect(gamePulse(game({ teams: tied }), { now: NOW }).score)
      .toBeGreaterThan(gamePulse(game({ teams: tied, period: 1, clockSec: 800 }), { now: NOW }).score);
  });

  it('flags an underdog leading after halftime', () => {
    const upset = gamePulse(game({ favorite: 'BAL' }), { now: NOW });
    const early = gamePulse(game({ favorite: 'BAL', period: 1, clockSec: 600 }), { now: NOW });

    expect(upset.upset).toBe(true);
    expect(early.upset).toBe(false);
  });

  it('adds overtime, red zone, followed team and fantasy bonuses up to 100', () => {
    const tied = [{ abbr: 'BAL', score: '20' }, { abbr: 'BUF', score: '20' }];
    const halfway = { period: 3, clockSec: 900 };

    expect(gamePulse(game(halfway), { now: NOW }).score).toBe(56);
    expect(gamePulse(game({ ...halfway, situation: { redZone: true } }), { now: NOW }).score).toBe(66);
    expect(gamePulse(game(halfway), { now: NOW, fantasyStarters: 5 }).score).toBe(71);
    expect(gamePulse(game({ teams: tied, period: 5, clockSec: 300 }), { now: NOW, follows: new Set(['nfl:BUF']) }).score).toBe(100);
  });

  it('scores upcoming games by start time and follows, and finished games as 0', () => {
    const soon = game({ status: 'pre', start: NOW + 10 * 60 * 1000 });
    const later = game({ status: 'pre', start: NOW + 3 * 60 * 60 * 1000 });

    expect(gamePulse(soon, { now: NOW }).score).toBe(10);
    expect(gamePulse(later, { now: NOW }).score).toBe(0);
    expect(gamePulse(later, { now: NOW, follows: new Set(['nfl:BAL']) }).score).toBe(25);
    expect(gamePulse(game({ status: 'final' }), { now: NOW }).score).toBe(0);
  });
});

describe('helpers', () => {
  it('finds the leader and followed teams', () => {
    expect(leaderOf(game())).toBe('BUF');
    expect(leaderOf(game({ teams: [{ abbr: 'BAL', score: '7' }, { abbr: 'BUF', score: '7' }] }))).toBeNull();
    expect(isFollowedGame(game(), new Set([teamKey('nfl', 'BAL')]))).toBe(true);
    expect(isFollowedGame(game(), new Set([teamKey('nba', 'BAL')]))).toBe(false);
  });
});
