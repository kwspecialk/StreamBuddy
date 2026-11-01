import { useEffect, useMemo, useRef, useState } from 'react';
import { attachScores, fetchScores } from './utils/matchScores';

const SCORE_REFRESH_INTERVAL_MS = 180000;
const REFRESH_CHECK_INTERVAL_MS = 15000;

// Adds ESPN scores to matches, polling only while `enabled` and the tab is visible.
// Any failure leaves matches without scores, so cards fall back to plain LIVE.
export const useMatchScores = (matches, enabled) => {
  const [scores, setScores] = useState([]);
  const lastFetchRef = useRef(0);

  useEffect(() => {
    if (!enabled) return undefined;

    const refreshIfDue = async () => {
      if (document.hidden || Date.now() - lastFetchRef.current < SCORE_REFRESH_INTERVAL_MS) return;
      lastFetchRef.current = Date.now();
      try {
        setScores(await fetchScores());
      } catch (error) {
        setScores([]);
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

  return useMemo(() => attachScores(matches, scores), [matches, scores]);
};
