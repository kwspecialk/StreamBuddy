import { parseLiveMatches, formatEmbedTitle } from './ppvApi';

const NOW = 1000;

const stream = (overrides) => ({
  id: 1,
  name: 'Chiefs at Broncos',
  category_name: 'American Football',
  poster: 'https://example.com/poster.jpg',
  source_tag: 'HD',
  iframe: 'https://example.com/embed/chiefs-broncos',
  starts_at: 900,
  ends_at: 1100,
  always_live: 0,
  viewers: '10',
  substreams: [],
  ...overrides
});

const parse = (...streams) => parseLiveMatches({ streams: [{ category: 'Any', streams }] }, NOW);

describe('parseLiveMatches', () => {
  it('maps a stream and its substreams to the match shape', () => {
    const [match] = parse(stream({
      substreams: [{ iframe: 'https://example.com/embed/chiefs-broncos_540p', source_tag: 'SD' }]
    }));

    expect(match).toMatchObject({
      id: 1,
      title: 'Chiefs at Broncos',
      category: 'american-football',
      poster: 'https://example.com/poster.jpg',
      sources: [
        { embedUrl: 'https://example.com/embed/chiefs-broncos', label: 'HD' },
        { embedUrl: 'https://example.com/embed/chiefs-broncos_540p', label: 'SD' }
      ]
    });
  });

  it('keeps only streams live now, plus always-live channels', () => {
    const matches = parse(
      stream({ id: 1 }),
      stream({ id: 2, starts_at: 2000, ends_at: 3000 }),
      stream({ id: 3, starts_at: 100, ends_at: 200 }),
      stream({ id: 4, starts_at: 0, ends_at: 0, always_live: 1 })
    );

    expect(matches.map(m => m.id).sort()).toEqual([1, 4]);
  });

  it('skips duplicates and streams without an embed', () => {
    const matches = parse(stream({ id: 1 }), stream({ id: 1 }), stream({ id: 2, iframe: '' }));

    expect(matches.map(m => m.id)).toEqual([1]);
  });

  it('orders by viewers and flags the top streams as popular', () => {
    const streams = Array.from({ length: 13 }, (_, i) => stream({ id: i + 1, viewers: String(i) }));
    const matches = parse(...streams);

    expect(matches[0].id).toBe(13);
    expect(matches.filter(m => m.popular)).toHaveLength(12);
    expect(matches[12].popular).toBe(false);
  });

  it('handles an empty response', () => {
    expect(parseLiveMatches(null)).toEqual([]);
  });
});

describe('formatEmbedTitle', () => {
  it('builds a title from a ppv embed URL', () => {
    expect(formatEmbedTitle('https://example.com/embed/nfl-redzone-31494_540p')).toBe('Nfl Redzone');
    expect(formatEmbedTitle('https://example.com/embed/nba-reg/week-8/nop-ind?refresh_id=1')).toBe('Nop Ind');
  });

  it('leaves on-demand and unrecognised URLs alone', () => {
    const onDemand = 'https://vidsrc.sh/embed/tv/123/1-1';
    expect(formatEmbedTitle(onDemand)).toBe(onDemand);
    expect(formatEmbedTitle('https://example.com/watch')).toBe('https://example.com/watch');
  });
});
