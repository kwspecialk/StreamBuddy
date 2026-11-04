// Game Pulse: 0-100 for "should I be watching this game right now?", from /api/scores games
const SOON_MS = 15 * 60 * 1000;

// scale is the margin that stops a game feeling close: one score, two possessions, two goals.
// Soccer's clock counts up through 90 minutes; the others count down each period.
const SPORTS = {
  football: { periods: 4, periodSec: 900, scale: 17 },
  basketball: { periods: 4, periodSec: 720, scale: 15 },
  nbl: { periods: 4, periodSec: 600, scale: 15 },
  hockey: { periods: 3, periodSec: 1200, scale: 3 },
  soccer: { periods: 2, periodSec: 2700, scale: 3, countsUp: true }
};

const LEAGUE_SPORTS = { nfl: 'football', nba: 'basketball', nbl: 'nbl', nhl: 'hockey' };

const BONUS = { upset: 0.15, overtime: 0.2, redZone: 0.1, following: 0.25, fantasyEach: 0.05, fantasyMax: 0.15 };

const sportFor = (league) => SPORTS[LEAGUE_SPORTS[league] || 'soccer'];

const clamp01 = (value) => Math.min(Math.max(value, 0), 1);

export const isInPlay = (game) => game.status === 'live' || game.status === 'break';

export const teamKey = (league, abbr) => `${league}:${abbr}`;

export const isFollowedGame = (game, follows) =>
  game.teams.some(team => follows.has(teamKey(game.league, team.abbr)));

export const leaderOf = (game) => {
  const [first, second] = game.teams.map(team => Number(team.score));
  if (Number.isNaN(first) || Number.isNaN(second) || first === second) return null;
  return first > second ? game.teams[0].abbr : game.teams[1].abbr;
};

// Share of regulation played, 0 to 1. Overtime counts as fully late.
export const lateness = (game) => {
  const sport = sportFor(game.league);
  if (game.status === 'final') return 1;
  if (!game.period || game.clockSec === null || game.clockSec === undefined) return 0;
  if (game.period > sport.periods) return 1;
  if (sport.countsUp) return clamp01(game.clockSec / (sport.periods * sport.periodSec));

  const played = (game.period - 1) * sport.periodSec + (sport.periodSec - game.clockSec);
  return clamp01(played / (sport.periods * sport.periodSec));
};

// `follows` is a Set of teamKey()s. `fantasyStarters` is for a later fantasy import and is 0 until then.
export const gamePulse = (game, { follows = new Set(), fantasyStarters = 0, now = Date.now() } = {}) => {
  const following = isFollowedGame(game, follows);
  const result = { score: 0, close: null, late: 0, upset: false, closeAndLate: false, following };

  if (game.status === 'pre') {
    const soon = game.start - now <= SOON_MS;
    return { ...result, score: Math.round(((soon ? 0.1 : 0) + (following ? BONUS.following : 0)) * 100) };
  }
  if (!isInPlay(game)) return { ...result, late: 1 };

  const sport = sportFor(game.league);
  const [first, second] = game.teams.map(team => Number(team.score) || 0);
  const close = Math.max(0, 1 - Math.abs(first - second) / sport.scale);
  const late = lateness(game);
  const leader = leaderOf(game);
  const upset = Boolean(leader && game.favorite && leader !== game.favorite && late >= 0.5);

  let value = close * (0.35 + 0.65 * late);
  if (upset) value += BONUS.upset;
  if (game.period > sport.periods) value += BONUS.overtime;
  if (game.situation?.redZone) value += BONUS.redZone;
  if (following) value += BONUS.following;
  value += Math.min(BONUS.fantasyMax, BONUS.fantasyEach * fantasyStarters);

  return {
    ...result,
    score: Math.min(100, Math.round(value * 100)),
    close,
    late,
    upset,
    closeAndLate: close >= 0.5 && late >= 0.75
  };
};
