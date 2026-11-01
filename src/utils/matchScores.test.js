import { parseMatchSlug, findScore, attachScores } from './matchScores';
import { trimEvent, pickPreGameOdds } from '../../api/scores';

const START = 1793556000;

const game = (overrides) => ({
  id: '1',
  league: 'nfl',
  start: START * 1000,
  status: 'live',
  clock: '4th 8:18',
  teams: [
    { abbr: 'BAL', name: 'Baltimore Ravens', score: '17' },
    { abbr: 'BUF', name: 'Buffalo Bills', score: '20' }
  ],
  odds: null,
  ...overrides
});

const match = (overrides) => ({
  id: 1,
  title: 'Baltimore Ravens at Buffalo Bills',
  uriName: 'nfl/2026-11-01/bal-buf',
  startsAt: START,
  ...overrides
});

describe('parseMatchSlug', () => {
  it('reads the league and teams', () => {
    expect(parseMatchSlug('nfl/2026-11-01/bal-buf')).toEqual({ league: 'nfl', teams: ['bal', 'buf'] });
    expect(parseMatchSlug('liga-mx/2026-11-01/ame-cha')).toEqual({ league: 'liga-mx', teams: ['ame', 'cha'] });
  });

  it('rejects channels and non-team slugs', () => {
    expect(parseMatchSlug('247-south-park')).toBeNull();
    expect(parseMatchSlug('f1/2026/mexico/race')).toBeNull();
    expect(parseMatchSlug(undefined)).toBeNull();
  });
});

describe('findScore', () => {
  it('matches a slug to ESPN abbreviations in either order', () => {
    const espn = game();

    expect(findScore(match(), [espn])).toBe(espn);
    expect(findScore(match({ uriName: 'nfl/2026-11-01/buf-bal' }), [espn])).toBe(espn);
  });

  it('keeps the league in the key', () => {
    const teams = [{ abbr: 'NE', name: 'New England Patriots' }, { abbr: 'MIA', name: 'Miami Dolphins' }];
    const nfl = game({ id: 'nfl', teams });
    const mls = game({ id: 'mls', league: 'mls', teams });

    expect(findScore(match({ uriName: 'mls/2026-11-01/mia-ne', title: 'x' }), [nfl, mls])).toBe(mls);
  });

  it('picks the closest start when the same teams play twice', () => {
    const today = game({ id: 'today' });
    const yesterday = game({ id: 'yesterday', start: (START - 86400) * 1000 + 3600000 });

    expect(findScore(match(), [yesterday, today])).toBe(today);
  });

  it('falls back to normalised names near the start time', () => {
    const espn = game({
      league: 'ligue1',
      teams: [
        { abbr: 'ASSE', name: 'AS Saint-Étienne' },
        { abbr: 'FCN', name: 'Nantes' }
      ]
    });

    expect(findScore(match({
      uriName: 'ligue1/2026-11-01/ste-nan',
      title: 'FC Nantes vs. AS Saint-Etienne'
    }), [espn])).toBe(espn);
  });

  it('does not use the name fallback for a distant game', () => {
    const espn = game({ start: (START + 4 * 3600) * 1000 });

    expect(findScore(match({ uriName: 'nfl/2026-11-01/rav-bil' }), [espn])).toBeNull();
  });

  it('does not confuse teams that share a city', () => {
    const espn = game({
      league: 'pl',
      teams: [
        { abbr: 'MNC', name: 'Manchester City' },
        { abbr: 'LEI', name: 'Leicester City' }
      ]
    });

    expect(findScore(match({
      uriName: 'pl/2026-11-01/mun-lei',
      title: 'Manchester United vs. Leicester City'
    }), [espn])).toBeNull();
  });

  it('never matches channels or race slugs', () => {
    expect(findScore(match({ uriName: '247-south-park', title: 'Ravens at Bills' }), [game()])).toBeNull();
    expect(findScore(match({ uriName: 'f1/2026/mexico/race' }), [game()])).toBeNull();
  });
});

describe('attachScores', () => {
  it('adds a score to matched games and leaves the rest alone', () => {
    const channel = match({ id: 2, uriName: 'nfl-network', title: 'NFL Network' });
    const espn = game();
    const [matched, unmatched] = attachScores([match(), channel], [espn]);

    expect(matched.score).toBe(espn);
    expect(unmatched).toBe(channel);
  });

  it('returns the same list when there are no scores', () => {
    const matches = [match()];

    expect(attachScores(matches, [])).toBe(matches);
  });
});

describe('scores route', () => {
  const event = (overrides = {}) => ({
    id: '9',
    date: '2026-11-01T18:00Z',
    status: { type: { state: 'in', name: 'STATUS_IN_PROGRESS', shortDetail: '8:18 - 4th' } },
    competitions: [{
      competitors: [
        { homeAway: 'home', score: '20', team: { abbreviation: 'BUF', displayName: 'Buffalo Bills' } },
        { homeAway: 'away', score: '17', team: { abbreviation: 'BAL', displayName: 'Baltimore Ravens' } }
      ],
      odds: [{ details: 'BUF -3', overUnder: 54.5, provider: { name: 'Book' }, link: { href: 'https://book.example' } }]
    }],
    ...overrides
  });

  it('trims an event and strips sportsbook data', () => {
    expect(trimEvent(event(), 'nfl')).toEqual({
      id: '9',
      league: 'nfl',
      start: Date.parse('2026-11-01T18:00Z'),
      status: 'live',
      clock: '4th 8:18',
      teams: [
        { abbr: 'BAL', name: 'Baltimore Ravens', score: '17' },
        { abbr: 'BUF', name: 'Buffalo Bills', score: '20' }
      ],
      odds: { line: 'BUF -3', total: 54.5 }
    });
  });

  it('lists soccer teams home first', () => {
    expect(trimEvent(event(), 'pl').teams[0].abbr).toBe('BUF');
  });

  it('labels halftime, finals and called-off games', () => {
    const status = (type) => trimEvent(event({ status: { type } }), 'nfl');

    expect(status({ state: 'in', name: 'STATUS_HALFTIME', shortDetail: 'Halftime' }).status).toBe('break');
    expect(status({ state: 'post', completed: true, shortDetail: 'Final' })).toMatchObject({ status: 'final', odds: null });
    expect(status({ state: 'post', completed: false, shortDetail: 'Postponed' }).status).toBe('off');
  });

  it('skips the live book when picking pre-game odds', () => {
    expect(pickPreGameOdds([
      { provider: { name: 'Draft Kings - Live Odds' }, details: 'BUF -15.5', overUnder: 46.5 },
      { provider: { name: 'Draft Kings' }, details: 'BUF -3', overUnder: 54.5 }
    ])).toEqual({ line: 'BUF -3', total: 54.5 });
    expect(pickPreGameOdds([{ provider: { name: 'Draft Kings - Live Odds' }, details: 'BUF -15.5' }])).toBeNull();
  });
});
