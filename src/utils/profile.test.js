import { PROFILE_KEY, loadProfile, saveProfile, toggleTeam, updateScoreMode } from './profile';

const save = (doc) => localStorage.setItem(PROFILE_KEY, JSON.stringify(doc));

describe('profile', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty and survives bad or unknown data', () => {
    expect(loadProfile()).toEqual({ v: 2, follow: { teams: [] }, scoreMode: { cards: [], ticker: false, drawer: 'auto' } });

    localStorage.setItem(PROFILE_KEY, '{not json');
    expect(loadProfile().follow.teams).toEqual([]);

    save({ v: 0, follow: { teams: ['nfl:BUF'] } });
    expect(loadProfile().follow.teams).toEqual([]);
  });

  it('moves a v1 profile to v2 and keeps its follows', () => {
    save({ v: 1, follow: { teams: ['nfl:BUF'] }, updatedAt: '2026-11-02T00:00:00.000Z' });
    expect(loadProfile()).toMatchObject({ v: 2, follow: { teams: ['nfl:BUF'] }, scoreMode: { cards: [], ticker: false, drawer: 'auto' } });
  });

  it('drops cards it cannot read', () => {
    save({
      v: 2,
      follow: { teams: [] },
      scoreMode: { cards: [{ id: 'a', at: null }, { id: 'b', at: { x: 0.5, y: 'top' } }, { at: null }], ticker: 'yes', drawer: 'sideways' }
    });
    expect(loadProfile().scoreMode).toEqual({ cards: [{ id: 'a', at: null }], ticker: false, drawer: 'auto' });
  });

  it('toggles a team and round-trips through storage', () => {
    const followed = toggleTeam(loadProfile(), 'nfl:BUF');
    saveProfile(followed);

    expect(loadProfile().follow.teams).toEqual(['nfl:BUF']);
    expect(toggleTeam(followed, 'nfl:BUF').follow.teams).toEqual([]);
  });

  it('saves cards, the ticker and the drawer settings', () => {
    saveProfile(updateScoreMode(loadProfile(), { cards: [{ id: 'g1', at: { x: 1, y: 0 } }], ticker: true, drawer: 'dock' }));
    expect(loadProfile().scoreMode).toEqual({ cards: [{ id: 'g1', at: { x: 1, y: 0 } }], ticker: true, drawer: 'dock' });
  });
});
