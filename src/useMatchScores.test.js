import { renderHook, act, waitFor } from '@testing-library/react';
import { useMatchScores, useScoresFeed } from './useMatchScores';

const game = {
  id: '1',
  league: 'nfl',
  start: 1793556000000,
  teams: [{ abbr: 'BAL', name: 'Baltimore Ravens' }, { abbr: 'BUF', name: 'Buffalo Bills' }]
};
const matches = [{ id: 1, title: 'x', uriName: 'nfl/2026-11-01/bal-buf', startsAt: 1793556000 }];

const setHidden = (hidden) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
};

describe('useMatchScores', () => {
  beforeEach(() => {
    setHidden(false);
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => [game] }));
  });

  it('adds scores to matches', async () => {
    const { result } = renderHook(() => useMatchScores(matches, true));

    await waitFor(() => expect(result.current[0].score).toBe(game));
  });

  it('does not fetch when disabled', () => {
    renderHook(() => useMatchScores(matches, false));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('waits for the tab to become visible', async () => {
    setHidden(true);
    const { result } = renderHook(() => useMatchScores(matches, true));
    expect(global.fetch).not.toHaveBeenCalled();

    setHidden(false);
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });

    await waitFor(() => expect(result.current[0].score).toBe(game));
  });

  it('keeps plain matches when the fetch fails', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 502 }));
    const { result } = renderHook(() => useMatchScores(matches, true));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(result.current).toBe(matches);
  });

  it('reports loading, then whether the poll worked', async () => {
    const { result } = renderHook(() => useScoresFeed(true));
    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('ok'));
    expect(result.current.scores).toEqual([game]);
  });

  it('reports a failed poll apart from an empty one', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 502 }));
    const { result } = renderHook(() => useScoresFeed(true));

    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.scores).toEqual([]);
  });
});
