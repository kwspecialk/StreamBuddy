// Link ppv.st matches to the ESPN games from /api/scores
const SCORES_URL = '/api/scores';
const HOUR_MS = 60 * 60 * 1000;
const MAX_SLUG_START_GAP_MS = 18 * HOUR_MS;
const MAX_NAME_START_GAP_MS = 3 * HOUR_MS;

// e.g. nfl/2026-11-01/bal-buf. 24/7 channels and f1/2026/mexico/race don't fit this
const SLUG_PATTERN = /^([a-z0-9-]+)\/\d{4}-\d{2}-\d{2}\/([a-z0-9]+)-([a-z0-9]+)$/i;
const TITLE_SEPARATOR = /\s+(?:vs\.?|v\.?|at|@)\s+/i;
const CLUB_WORDS = /\b(?:fc|cf|sc|afc|ac|cd|fk|if|sk|bk)\b/g;

export const parseMatchSlug = (uriName) => {
  const [, league, first, second] = uriName?.match(SLUG_PATTERN) || [];
  return league ? { league: league.toLowerCase(), teams: [first, second] } : null;
};

// Slugs list US teams away-home and soccer teams home-away, so a pair has no order
const pairKey = (first, second) => [first.toUpperCase(), second.toUpperCase()].sort().join('-');

const normaliseName = (name = '') => name
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9 ]/g, ' ')
  .replace(CLUB_WORDS, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const isSameTeam = (first, second) => {
  const [a, b] = [normaliseName(first), normaliseName(second)];
  return Boolean(a && b) && (a === b || ` ${a} `.includes(` ${b} `) || ` ${b} `.includes(` ${a} `));
};

const isSameTeamPair = ([first, second], [teamA, teamB]) =>
  (isSameTeam(first, teamA.name) && isSameTeam(second, teamB.name)) ||
  (isSameTeam(first, teamB.name) && isSameTeam(second, teamA.name));

const startGap = (match, game) => Math.abs(match.startsAt * 1000 - game.start);

const closestGame = (match, games, maxGap) => games
  .filter(game => startGap(match, game) <= maxGap)
  .sort((a, b) => startGap(match, a) - startGap(match, b))[0];

export const findScore = (match, scores) => {
  const slug = parseMatchSlug(match.uriName);
  if (!slug) return null;

  const leagueGames = scores.filter(game => game.league === slug.league);
  const key = pairKey(...slug.teams);
  const bySlug = leagueGames.filter(game => pairKey(game.teams[0].abbr, game.teams[1].abbr) === key);
  const slugMatch = closestGame(match, bySlug, MAX_SLUG_START_GAP_MS);
  if (slugMatch) return slugMatch;

  const titleTeams = (match.title || '').split(TITLE_SEPARATOR);
  if (titleTeams.length !== 2) return null;

  const byName = leagueGames.filter(game => isSameTeamPair(titleTeams, game.teams));
  return closestGame(match, byName, MAX_NAME_START_GAP_MS) || null;
};

export const attachScores = (matches, scores) => {
  if (!scores.length) return matches;

  return matches.map(match => {
    const score = findScore(match, scores);
    return score ? { ...match, score } : match;
  });
};

export const fetchScores = async () => {
  // Browsers apply stale-while-revalidate too, which would show the previous poll's scores
  const response = await fetch(SCORES_URL, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Scores responded with status: ${response.status}`);
  }
  // The whole app reads this list, so anything else counts as a failed poll
  const games = await response.json();
  if (!Array.isArray(games)) throw new Error('Scores response is not a list');
  return games;
};
