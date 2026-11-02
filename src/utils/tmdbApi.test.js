import { curateTrending } from './tmdbApi';

const TODAY = '2026-11-01';
const title = (id, overrides = {}) => ({
  id,
  release_date: '2026-10-01',
  poster_path: '/poster.jpg',
  vote_count: 500,
  original_language: 'en',
  ...overrides
});

describe('curateTrending', () => {
  it('drops unreleased, undated, posterless and barely-rated titles', () => {
    const results = [
      title(1),
      title(2, { release_date: '2026-12-16', vote_count: 0 }),
      title(3, { release_date: '2026-11-18' }),
      title(4, { release_date: '' }),
      title(5, { poster_path: null }),
      title(6, { vote_count: 99 })
    ];
    expect(curateTrending(results, TODAY).map(item => item.id)).toEqual([1]);
  });

  it('accepts TV first_air_date and removes page duplicates', () => {
    const show = { id: 7, first_air_date: '2021-01-08', poster_path: '/p.jpg', vote_count: 2766, original_language: 'en' };
    expect(curateTrending([show, show], TODAY)).toEqual([show]);
  });

  it('sinks non-English titles without removing them', () => {
    const results = [title(1, { original_language: 'ko' }), ...Array.from({ length: 15 }, (_, i) => title(i + 2))];
    const ids = curateTrending(results, TODAY).map(item => item.id);
    expect(ids.slice(0, 11)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(ids[11]).toBe(1);
  });
});
