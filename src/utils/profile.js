// Everything a viewer saves, as one versioned doc so it can sync to an account later.
// v2 added Score Mode: pinned score cards, the ticker setting and where the scores drawer goes.
export const PROFILE_KEY = 'streambuddy.profile';
const VERSION = 2;

const emptyScoreMode = () => ({ cards: [], ticker: false, drawer: 'auto' });

const DRAWER_MODES = ['auto', 'dock', 'float'];

const emptyProfile = () => ({ v: VERSION, follow: { teams: [] }, scoreMode: emptyScoreMode() });

const isPosition = (at) => at === null || (Number.isFinite(at?.x) && Number.isFinite(at?.y));

const isCard = (card) => typeof card?.id === 'string' && isPosition(card.at);

// Older or hand-edited docs keep what still makes sense and fill in the rest
const migrate = (saved) => {
  if (!Array.isArray(saved?.follow?.teams)) return emptyProfile();
  if (saved.v === 1) return { ...saved, v: VERSION, scoreMode: emptyScoreMode() };
  if (saved.v !== VERSION) return emptyProfile();

  const cards = Array.isArray(saved.scoreMode?.cards) ? saved.scoreMode.cards.filter(isCard) : [];
  const drawer = DRAWER_MODES.includes(saved.scoreMode?.drawer) ? saved.scoreMode.drawer : 'auto';
  return { ...saved, scoreMode: { cards, ticker: saved.scoreMode?.ticker === true, drawer } };
};

export const loadProfile = () => {
  try {
    return migrate(JSON.parse(localStorage.getItem(PROFILE_KEY)));
  } catch (error) {
    return emptyProfile();
  }
};

export const saveProfile = (profile) => {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...profile, v: VERSION, updatedAt: new Date().toISOString() }));
  } catch (error) {
    // Private windows can refuse storage. Changes then last for this visit only.
  }
};

export const toggleTeam = (profile, key) => {
  const teams = profile.follow.teams.includes(key)
    ? profile.follow.teams.filter(team => team !== key)
    : [...profile.follow.teams, key];
  return { ...profile, follow: { ...profile.follow, teams } };
};

export const updateScoreMode = (profile, changes) => ({ ...profile, scoreMode: { ...profile.scoreMode, ...changes } });
