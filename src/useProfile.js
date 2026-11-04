import { useCallback, useMemo, useState } from 'react';
import { loadProfile, saveProfile, toggleTeam, updateScoreMode } from './utils/profile';
import { moveCard, pinCard, unpinCard } from './utils/scoreCards';

// The saved profile: followed teams as a Set of "league:ABBR" keys, pinned score cards and
// the ticker and drawer settings. Every change is saved straight away.
const useProfile = () => {
  const [profile, setProfile] = useState(loadProfile);

  const change = useCallback((update) => {
    setProfile(current => {
      const next = update(current);
      saveProfile(next);
      return next;
    });
  }, []);

  const toggleFollow = useCallback((key) => change(current => toggleTeam(current, key)), [change]);

  const { cards, ticker, drawer } = profile.scoreMode;

  // Returns false when the device's card limit is reached
  const pin = (id, options) => {
    const result = pinCard(cards, id, options);
    if (result.ok) change(current => updateScoreMode(current, { cards: pinCard(current.scoreMode.cards, id, options).cards }));
    return result.ok;
  };

  const unpin = useCallback((id) => change(current => updateScoreMode(current, { cards: unpinCard(current.scoreMode.cards, id) })), [change]);

  const move = useCallback((id, at) => change(current => updateScoreMode(current, { cards: moveCard(current.scoreMode.cards, id, at) })), [change]);

  const toggleTicker = useCallback(() => change(current => updateScoreMode(current, { ticker: !current.scoreMode.ticker })), [change]);

  // 'auto' lets the window decide; 'dock' or 'float' is the viewer's own pick
  const setDrawerMode = useCallback((mode) => change(current => updateScoreMode(current, { drawer: mode })), [change]);

  const follows = useMemo(() => new Set(profile.follow.teams), [profile.follow.teams]);

  return { follows, toggleFollow, cards, pin, unpin, move, isTickerOn: ticker, toggleTicker, drawerMode: drawer, setDrawerMode };
};

export default useProfile;
