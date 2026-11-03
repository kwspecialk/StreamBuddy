import { useCallback, useMemo, useState } from 'react';
import { loadProfile, saveProfile, toggleTeam } from './utils/profile';

// Followed teams as a Set of "league:ABBR" keys, saved to the profile on every change
const useFollows = () => {
  const [profile, setProfile] = useState(loadProfile);

  const toggleFollow = useCallback((key) => {
    setProfile(current => {
      const next = toggleTeam(current, key);
      saveProfile(next);
      return next;
    });
  }, []);

  const follows = useMemo(() => new Set(profile.follow.teams), [profile]);

  return { follows, toggleFollow };
};

export default useFollows;
