import { CARD_SIZE, cardFractions, cardPixels, moveCard, pinCard, pinnedRows, tickerDuration, tickerRows, unpinCard } from './scoreCards';

const row = (id, status, pulse) => ({ game: { id, status }, pulse: { score: pulse } });
const GRID = { width: 1000, height: 600 };

describe('pinCard', () => {
  const known = new Set(['a', 'b', 'c']);

  it('adds a card at the default spot and ignores a second pin', () => {
    const { cards, ok } = pinCard([], 'a', { max: 2, knownIds: known });
    expect(ok).toBe(true);
    expect(cards).toEqual([{ id: 'a', at: null }]);
    expect(pinCard(cards, 'a', { max: 1, knownIds: known }).cards).toBe(cards);
  });

  it('refuses past the device limit', () => {
    const full = [{ id: 'a', at: null }, { id: 'b', at: null }];
    expect(pinCard(full, 'c', { max: 2, knownIds: known })).toEqual({ cards: full, ok: false });
  });

  it('lets cards for games that left the feed make room', () => {
    const stale = [{ id: 'gone', at: null }, { id: 'a', at: null }];
    expect(pinCard(stale, 'b', { max: 2, knownIds: known }).cards.map(card => card.id)).toEqual(['a', 'b']);
    // An empty feed means it hasn't loaded, so nothing counts as gone
    expect(pinCard(stale, 'b', { max: 2, knownIds: new Set() }).ok).toBe(false);
  });
});

it('unpins and moves one card', () => {
  const cards = [{ id: 'a', at: null }, { id: 'b', at: null }];
  expect(unpinCard(cards, 'a')).toEqual([{ id: 'b', at: null }]);
  expect(moveCard(cards, 'b', { x: 0, y: 1 })[1]).toEqual({ id: 'b', at: { x: 0, y: 1 } });
});

it('pinnedRows keeps pinned order and skips games missing from the feed', () => {
  const rows = [row('a', 'live', 10), row('b', 'live', 90)];
  const entries = pinnedRows([{ id: 'b', at: null }, { id: 'gone', at: null }, { id: 'a', at: null }], rows);
  expect(entries.map(entry => entry.row.game.id)).toEqual(['b', 'a']);
});

describe('card positions', () => {
  it('stacks unmoved cards down the top right', () => {
    const first = cardPixels({ at: null }, 0, GRID);
    const second = cardPixels({ at: null }, 1, GRID);
    expect(first.left + CARD_SIZE.width).toBeLessThanOrEqual(GRID.width);
    expect(second.left).toBe(first.left);
    expect(second.top).toBeGreaterThan(first.top + CARD_SIZE.height);
  });

  it('keeps every card inside a small grid', () => {
    const tiny = { width: 300, height: 200 };
    const { left, top } = cardPixels({ at: null }, 3, tiny);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(top + CARD_SIZE.height).toBeLessThanOrEqual(tiny.height);
  });

  it('round-trips a dragged spot and keeps corners when the grid resizes', () => {
    const at = cardFractions({ left: 200, top: 100 }, GRID);
    expect(cardPixels({ at }, 0, GRID)).toEqual({ left: 200, top: 100 });

    const corner = cardFractions({ left: GRID.width - CARD_SIZE.width, top: GRID.height - CARD_SIZE.height }, GRID);
    const bigger = { width: 1600, height: 900 };
    expect(cardPixels({ at: corner }, 0, bigger)).toEqual({ left: bigger.width - CARD_SIZE.width, top: bigger.height - CARD_SIZE.height });
  });

  it('clamps spots outside the grid', () => {
    expect(cardFractions({ left: -50, top: 9999 }, GRID)).toEqual({ x: 0, y: 1 });
  });
});

describe('ticker', () => {
  it('lists games in play, hottest first', () => {
    const rows = [row('cold', 'live', 12), row('later', 'pre', 40), row('half', 'break', 55), row('done', 'final', 0), row('hot', 'live', 88)];
    expect(tickerRows(rows).map(r => r.game.id)).toEqual(['hot', 'half', 'cold']);
  });

  it('scales the crawl with the number of games', () => {
    expect(tickerDuration(1)).toBe(20);
    expect(tickerDuration(10)).toBeGreaterThan(tickerDuration(5));
  });
});
