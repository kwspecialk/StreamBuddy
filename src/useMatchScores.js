import { useEffect, useMemo, useRef, useState } from 'react';
import { attachScores, fetchScores } from './utils/matchScores';

const SCORE_REFRESH_INTERVAL_MS = 180000;
const REFRESH_CHECK_INTERVAL_MS = 15000;

// The ESPN games from /api/scores, polling only while `enabled` and the tab is visible.
// Any failure gives an empty list, so cards fall back to plain LIVE. `status` is 'loading'
// until the first answer, then 'ok' or 'failed' after each poll, so an empty list from a
// failed poll doesn't read as loading or as no games.
export const useScoresFeed = (enabled) => {
  const [feed, setFeed] = useState({ scores: [], status: 'loading' });
  const lastFetchRef = useRef(0);

  useEffect(() => {
    if (!enabled) return undefined;

    const refreshIfDue = async () => {
      if (document.hidden || Date.now() - lastFetchRef.current < SCORE_REFRESH_INTERVAL_MS) return;
      lastFetchRef.current = Date.now();
      try {
        setFeed({ scores: await fetchScores(), status: 'ok' });
      } catch (error) {
        setFeed({ scores: [], status: 'failed' });
      }
    };

    refreshIfDue();
    const timer = setInterval(refreshIfDue, REFRESH_CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', refreshIfDue);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfDue);
    };
  }, [enabled]);

  return feed;
};

export const useScores = (enabled) => useScoresFeed(enabled).scores;

// Adds ESPN scores to matches
export const useMatchScores = (matches, enabled) => {
  const scores = useScores(enabled);
  return useMemo(() => attachScores(matches, scores), [matches, scores]);
};
