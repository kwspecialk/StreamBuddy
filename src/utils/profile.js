// Everything a viewer saves, as one versioned doc so it can sync to an account later.
// Only followed teams live here so far.
export const PROFILE_KEY = 'streambuddy.profile';
const VERSION = 1;

const emptyProfile = () => ({ v: VERSION, follow: { teams: [] } });

export const loadProfile = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY));
    if (saved?.v !== VERSION || !Array.isArray(saved.follow?.teams)) return emptyProfile();
    return saved;
  } catch (error) {
    return emptyProfile();
  }
};

export const saveProfile = (profile) => {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...profile, v: VERSION, updatedAt: new Date().toISOString() }));
  } catch (error) {
    // Private windows can refuse storage. Follows then last for this visit only.
  }
};

export const toggleTeam = (profile, key) => {
  const teams = profile.follow.teams.includes(key)
    ? profile.follow.teams.filter(team => team !== key)
    : [...profile.follow.teams, key];
  return { ...profile, follow: { ...profile.follow, teams } };
};
