// Live scores and pre-game odds from ESPN's unofficial scoreboard JSON, as one cached list.
const SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports';
const CORE_URL = 'https://sports.core.api.espn.com/v2/sports';
const CACHE_CONTROL = 'public, s-maxage=180, stale-while-revalidate=180, stale-if-error=3600';
const FETCH_TIMEOUT_MS = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;
const GAME_WINDOW_MS = 12 * 60 * 60 * 1000;
const MAX_CACHED_ODDS = 500;

// ppv.st slug prefix -> ESPN sport and league
const LEAGUES = {
  nfl: ['football', 'nfl'],
  nba: ['basketball', 'nba'],
  nhl: ['hockey', 'nhl'],
  pl: ['soccer', 'eng.1'],
  laliga: ['soccer', 'esp.1'],
  seriea: ['soccer', 'ita.1'],
  bundesliga: ['soccer', 'ger.1'],
  ligue1: ['soccer', 'fra.1'],
  mls: ['soccer', 'usa.1'],
  'liga-mx': ['soccer', 'mex.1'],
  allsvenskan: ['soccer', 'swe.1'],
  nbl: ['basketball', 'nbl']
};

// The scoreboard drops odds at kick-off for these; soccer keeps them and ESPN has none for NBL
const LEAGUES_NEEDING_CORE_ODDS = ['nfl', 'nba', 'nhl'];

// Pre-game lines stop changing at kick-off, so warm instances can reuse them
const preGameOdds = new Map();

const fetchJson = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`ESPN responded with status: ${response.status}`);
  }
  return response.json();
};

const toDateParam = (ms) => new Date(ms).toISOString().slice(0, 10).replace(/-/g, '');

const toStatus = ({ state, name, completed }) => {
  if (state === 'pre') return 'pre';
  if (state === 'in') return name === 'STATUS_HALFTIME' ? 'break' : 'live';
  return completed ? 'final' : 'off'; // postponed or canceled
};

// "8:18 - 4th" reads better as "4th 8:18"
const toClock = (shortDetail = '') => shortDetail.replace(/^(.+) - (.+)$/, '$2 $1');

// `details` holds the closing line. Sportsbook names, links and logos are left out on purpose.
const toOdds = (odds) => (odds?.details ? { line: odds.details, total: odds.overUnder ?? null } : null);

const toTeam = (competitor) => ({
  abbr: competitor.team?.abbreviation || '',
  name: competitor.team?.displayName || '',
  score: competitor.score ?? null
});

export const trimEvent = (event, league) => {
  const competition = event.competitions?.[0];
  const home = competition?.competitors?.find(c => c.homeAway === 'home');
  const away = competition?.competitors?.find(c => c.homeAway === 'away');
  if (!home || !away) return null;

  const status = toStatus(event.status?.type || {});
  const isSoccer = LEAGUES[league][0] === 'soccer';

  return {
    id: event.id,
    league,
    start: Date.parse(event.date),
    status,
    clock: toClock(event.status?.type?.shortDetail),
    // Same order ppv.st titles use: US leagues away-home, soccer home-away
    teams: (isSoccer ? [home, away] : [away, home]).map(toTeam),
    odds: status === 'pre' || status === 'live' || status === 'break' ? toOdds(competition.odds?.[0]) : null
  };
};

const fetchLeague = async (league, dates) => {
  const [sport, espnLeague] = LEAGUES[league];
  const boards = await Promise.allSettled(dates.map(date =>
    fetchJson(`${SCOREBOARD_URL}/${sport}/${espnLeague}/scoreboard?dates=${date}`)
  ));

  const games = new Map();
  let anyLoaded = false;
  boards.forEach(board => {
    if (board.status !== 'fulfilled') return;
    anyLoaded = true;
    (board.value.events || []).forEach(event => {
      const game = trimEvent(event, league);
      if (game) games.set(game.id, game);
    });
  });
  if (!anyLoaded) throw new Error(`No scoreboard loaded for ${league}`);

  return Array.from(games.values());
};

// ESPN lists a separate "Live Odds" book for games in progress; only the pre-game one is wanted
export const pickPreGameOdds = (items = []) =>
  toOdds(items.find(item => item.details && !/live/i.test(item.provider?.name || '')));

const fetchPreGameOdds = async ({ id, league }) => {
  if (preGameOdds.has(id)) return preGameOdds.get(id);

  const [sport, espnLeague] = LEAGUES[league];
  const data = await fetchJson(`${CORE_URL}/${sport}/leagues/${espnLeague}/events/${id}/competitions/${id}/odds`);
  const odds = pickPreGameOdds(data.items);

  if (odds) {
    if (preGameOdds.size >= MAX_CACHED_ODDS) preGameOdds.clear();
    preGameOdds.set(id, odds);
  }
  return odds;
};

const addMissingOdds = (games) => Promise.all(games.map(async game => {
  const isInPlay = game.status === 'live' || game.status === 'break';
  if (game.odds || !isInPlay || !LEAGUES_NEEDING_CORE_ODDS.includes(game.league)) return game;

  try {
    return { ...game, odds: await fetchPreGameOdds(game) };
  } catch (error) {
    return game; // Scores still work without odds
  }
}));

export default async function handler(req, res) {
  try {
    const now = Date.now();
    // ESPN files games under the US date, which trails UTC, so a live game is on one of these
    const dates = [toDateParam(now), toDateParam(now - DAY_MS)];

    const results = await Promise.allSettled(Object.keys(LEAGUES).map(league => fetchLeague(league, dates)));
    const loaded = results.filter(result => result.status === 'fulfilled');
    if (loaded.length === 0) throw new Error('No ESPN scoreboards loaded');

    const games = loaded
      .flatMap(result => result.value)
      .filter(game => game.status !== 'off' && Math.abs(game.start - now) <= GAME_WINDOW_MS);

    res.setHeader('Cache-Control', CACHE_CONTROL);
    res.status(200).json(await addMissingOdds(games));
  } catch (error) {
    console.error('Scores API error:', error);
    // An error status, not an empty list, so the CDN keeps serving its last good copy
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json([]);
  }
}
