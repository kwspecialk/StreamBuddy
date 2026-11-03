// Rows for the scoreboard drawer: every ESPN game, its Pulse, its ppv stream and where it is on screen
import { findScore } from './matchScores';
import { findMatchForUrl } from './ppvApi';
import { gamePulse, isFollowedGame, isInPlay } from './gamePulse';

export const FILTERS = ['live', 'all', 'following'];

const US_LEAGUES = ['nfl', 'nba', 'nhl', 'nbl'];

// US games read away @ home; soccer lists the home side first
export const gameLabel = (game) => {
  const [first, second] = game.teams.map(team => team.abbr);
  return US_LEAGUES.includes(game.league) ? `${first} @ ${second}` : `${first} v ${second}`;
};

const formatStart = (ms) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

// Start time, clock or Final, for rows, cards and the ticker
export const statusText = (game) => {
  if (game.status === 'pre') return formatStart(game.start);
  if (game.status === 'final') return /final/i.test(game.clock) ? game.clock : 'Final';
  return game.clock;
};

// `matches` already went through attachScores. They are sorted by viewers, so the first
// match for a game is its busiest stream.
const streamsByGame = (matches) => {
  const byGame = new Map();
  matches.forEach(match => {
    if (match.score && match.sources?.length && !byGame.has(match.score.id)) byGame.set(match.score.id, match);
  });
  return byGame;
};

// Which game each player shows, by its index in videoUrls. Saved streams whose match left
// the ppv list still carry their old match info, so try that too.
export const gameIdsOnScreen = (videoUrls, matches, sourceIndices, scores) => videoUrls.map(url => {
  const match = findMatchForUrl(matches, url)?.match || sourceIndices[url]?.match;
  if (!match) return null;
  return (match.score || findScore(match, scores))?.id || null;
});

export const buildScoreboard = ({ scores, matches, videoUrls, sourceIndices, displayedCount, follows, now = Date.now() }) => {
  const streams = streamsByGame(matches);
  const onScreen = gameIdsOnScreen(videoUrls, matches, sourceIndices, scores);

  return scores.map(game => {
    // Players past the layout's limit stay loaded but hidden, so they count as streams, not tiles
    const streamIndex = onScreen.indexOf(game.id);
    return {
      game,
      pulse: gamePulse(game, { follows, now }),
      match: streams.get(game.id) || null,
      streamIndex,
      screenIndex: streamIndex < displayedCount ? streamIndex : -1
    };
  });
};

const SECTIONS = [
  { id: 'live', label: 'Live', test: game => isInPlay(game), order: (a, b) => b.pulse.score - a.pulse.score },
  { id: 'upcoming', label: 'Later today', test: game => game.status === 'pre', order: (a, b) => a.game.start - b.game.start },
  { id: 'final', label: 'Final', test: game => game.status === 'final', order: (a, b) => b.game.start - a.game.start }
];

export const countFor = (rows, filter, follows) => rows.filter(row => {
  if (filter === 'live') return isInPlay(row.game);
  if (filter === 'following') return isFollowedGame(row.game, follows);
  return true;
}).length;

// Sections in display order, each with its rows sorted. Empty sections are left out.
export const groupScoreboard = (rows, filter, follows) => {
  const visible = rows.filter(row => filter !== 'following' || isFollowedGame(row.game, follows));
  const sections = filter === 'live' ? SECTIONS.slice(0, 1) : SECTIONS;

  return sections
    .map(section => ({ id: section.id, label: section.label, rows: visible.filter(row => section.test(row.game)).sort(section.order) }))
    .filter(section => section.rows.length > 0);
};
