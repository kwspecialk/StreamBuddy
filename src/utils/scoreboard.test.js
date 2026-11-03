import { buildScoreboard, groupScoreboard, countFor, gameLabel } from './scoreboard';

const NOW = 1793556000000;

const game = (id, overrides) => ({
  id,
  league: 'nfl',
  start: NOW - 60 * 60 * 1000,
  status: 'live',
  period: 4,
  clockSec: 300,
  teams: [{ abbr: 'BAL', name: 'Baltimore Ravens', score: '17' }, { abbr: 'BUF', name: 'Buffalo Bills', score: '20' }],
  favorite: null,
  ...overrides
});

const close = game('close');
const blowout = game('blowout', { teams: [{ abbr: 'NE', score: '3' }, { abbr: 'MIA', score: '31' }] });
const later = game('later', { status: 'pre', start: NOW + 3 * 60 * 60 * 1000, teams: [{ abbr: 'KC', score: '0' }, { abbr: 'DEN', score: '0' }] });
const done = game('done', { status: 'final', teams: [{ abbr: 'NYJ', score: '10' }, { abbr: 'PIT', score: '24' }] });
const scores = [blowout, later, close, done];

const stream = (id, embedUrl, score) => ({ id, viewers: 10, sources: [{ embedUrl }], score });

const build = (overrides = {}) => buildScoreboard({
  scores,
  matches: [stream(1, 'https://a/close', close), stream(2, 'https://a/blowout', blowout)],
  videoUrls: ['https://a/blowout', 'https://a/close?refresh_id=5'],
  sourceIndices: {},
  displayedCount: 2,
  follows: new Set(),
  now: NOW,
  ...overrides
});

describe('buildScoreboard', () => {
  it('links games to streams and to the tiles showing them', () => {
    const rows = build();
    const row = id => rows.find(r => r.game.id === id);

    expect(row('close').match.id).toBe(1);
    expect(row('close').screenIndex).toBe(1);
    expect(row('blowout').screenIndex).toBe(0);
    expect(row('later').match).toBeNull();
    expect(row('later').screenIndex).toBe(-1);
  });

  it('does not count hidden players as on screen', () => {
    const row = build({ displayedCount: 1 }).find(r => r.game.id === 'close');

    expect(row.screenIndex).toBe(-1);
    expect(row.streamIndex).toBe(1);
  });
});

describe('groupScoreboard', () => {
  it('shows only live games by Pulse in the live filter', () => {
    const sections = groupScoreboard(build(), 'live', new Set());

    expect(sections.map(s => s.id)).toEqual(['live']);
    expect(sections[0].rows.map(r => r.game.id)).toEqual(['close', 'blowout']);
  });

  it('adds upcoming and final sections for the whole day', () => {
    expect(groupScoreboard(build(), 'all', new Set()).map(s => s.id)).toEqual(['live', 'upcoming', 'final']);
  });

  it('filters to followed teams and counts each filter', () => {
    const follows = new Set(['nfl:KC']);
    const rows = build({ follows });

    expect(groupScoreboard(rows, 'following', follows).flatMap(s => s.rows).map(r => r.game.id)).toEqual(['later']);
    expect(countFor(rows, 'live', follows)).toBe(2);
    expect(countFor(rows, 'all', follows)).toBe(4);
    expect(countFor(rows, 'following', follows)).toBe(1);
  });
});

describe('gameLabel', () => {
  it('uses @ for US leagues and v for soccer', () => {
    expect(gameLabel(close)).toBe('BAL @ BUF');
    expect(gameLabel({ ...close, league: 'pl' })).toBe('BAL v BUF');
  });
});
