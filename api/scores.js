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

// The colour ends up in a CSS background, so anything but a hex code is dropped
const HEX_COLOR = /^[0-9a-f]{3}(?:[0-9a-f]{3})?$/i;

const toTeam = (competitor) => ({
  abbr: competitor.team?.abbreviation || '',
  name: competitor.team?.displayName || '',
  score: competitor.score ?? null,
  color: HEX_COLOR.test(competitor.team?.color || '') ? `#${competitor.team.color}` : null,
  record: competitor.records?.[0]?.summary || null
});

// "BUF -3" names the favourite first. The line can use a longer code than the team,
// e.g. "UTAH -130" for UTA, so a prefix counts when it fits only one team.
export const toFavorite = (odds, teams) => {
  const code = odds?.line?.split(' ')[0];
  if (!code) return null;
  if (teams.some(team => team.abbr === code)) return code;

  const prefixed = teams.filter(team => team.abbr && (code.startsWith(team.abbr) || team.abbr.startsWith(code)));
  return prefixed.length === 1 ? prefixed[0].abbr : null;
};

// Only football fills this in, and only while a drive is on
const toSituation = (situation, competitors) => {
  if (!situation?.possession) return null;
  const team = competitors.find(c => c.team?.id === situation.possession);
  return team ? { possession: team.team.abbreviation, redZone: Boolean(situation.isRedZone) } : null;
};

export const trimEvent = (event, league) => {
  const competition = event.competitions?.[0];
  const home = competition?.competitors?.find(c => c.homeAway === 'home');
  const away = competition?.competitors?.find(c => c.homeAway === 'away');
  if (!home || !away) return null;

  const status = toStatus(event.status?.type || {});
  const isSoccer = LEAGUES[league][0] === 'soccer';
  // Same order ppv.st titles use: US leagues away-home, soccer home-away
  const teams = (isSoccer ? [home, away] : [away, home]).map(toTeam);
  // The line is dropped once a game ends, but who was favoured still matters for upsets
  const lineOdds = toOdds(competition.odds?.[0]);
  const isInPlay = status === 'live' || status === 'break';

  return {
    id: event.id,
    league,
    start: Date.parse(event.date),
    status,
    clock: toClock(event.status?.type?.shortDetail),
    period: event.status?.period ?? null,
    clockSec: event.status?.clock ?? null,
    teams,
    odds: status === 'pre' || isInPlay ? lineOdds : null,
    favorite: toFavorite(lineOdds, teams),
    situation: status === 'live' ? toSituation(competition.situation, competition.competitors) : null
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
  // The id goes into the URL path, so only ESPN's numeric ids are sent on
  if (!/^\d+$/.test(id)) return null;
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
    const odds = await fetchPreGameOdds(game);
    return { ...game, odds, favorite: game.favorite || toFavorite(odds, game.teams) };
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
