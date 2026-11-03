import { PROFILE_KEY, loadProfile, saveProfile, toggleTeam } from './profile';

describe('profile', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty and survives bad or old data', () => {
    expect(loadProfile()).toEqual({ v: 1, follow: { teams: [] } });

    localStorage.setItem(PROFILE_KEY, '{not json');
    expect(loadProfile().follow.teams).toEqual([]);

    localStorage.setItem(PROFILE_KEY, JSON.stringify({ v: 0, follow: { teams: ['nfl:BUF'] } }));
    expect(loadProfile().follow.teams).toEqual([]);
  });

  it('toggles a team and round-trips through storage', () => {
    const followed = toggleTeam(loadProfile(), 'nfl:BUF');
    saveProfile(followed);

    expect(loadProfile().follow.teams).toEqual(['nfl:BUF']);
    expect(toggleTeam(followed, 'nfl:BUF').follow.teams).toEqual([]);
  });
});
