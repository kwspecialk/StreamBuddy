import { renderHook, act, waitFor } from '@testing-library/react';
import { useScoresFeed } from './useMatchScores';

const game = {
  id: '1',
  league: 'nfl',
  start: 1793556000000,
  teams: [{ abbr: 'BAL', name: 'Baltimore Ravens' }, { abbr: 'BUF', name: 'Buffalo Bills' }]
};

const setHidden = (hidden) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
};

describe('useScoresFeed', () => {
  beforeEach(() => {
    setHidden(false);
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => [game] }));
  });

  it('does not fetch when disabled', () => {
    renderHook(() => useScoresFeed(false));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('waits for the tab to become visible', async () => {
    setHidden(true);
    const { result } = renderHook(() => useScoresFeed(true));
    expect(global.fetch).not.toHaveBeenCalled();

    setHidden(false);
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });

    await waitFor(() => expect(result.current.scores).toEqual([game]));
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

  it('treats a response that is not a list as failed', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ error: 'nope' }) }));
    const { result } = renderHook(() => useScoresFeed(true));

    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.scores).toEqual([]);
  });
});
