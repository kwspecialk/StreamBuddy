// Score cards float over the streams; the ticker runs along the bottom. Both read scoreboard rows.
import { isInPlay } from './gamePulse';

export const CARD_SIZE = { width: 184, height: 88 };
// Clears the main stream's mute button in the top right
const DEFAULT_INSET = { top: 44, right: 12 };
const CARD_GAP = 8;

const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

// Saved games that are still in the feed, in pinned order. A game that left the feed keeps
// its card saved (a league can fail to load for one refresh) but isn't drawn.
export const pinnedRows = (cards, rows) => {
  const byId = new Map(rows.map(row => [row.game.id, row]));
  return cards.map(card => ({ card, row: byId.get(card.id) })).filter(entry => entry.row);
};

// `knownIds` are the games in the current feed. Cards for games that left it give up
// their place first, so an old pin can't block a new one forever.
export const pinCard = (cards, id, { max, knownIds }) => {
  if (cards.some(card => card.id === id)) return { cards, ok: true };
  const kept = knownIds.size > 0 ? cards.filter(card => knownIds.has(card.id)) : cards;
  if (kept.length >= max) return { cards, ok: false };
  return { cards: [...kept, { id, at: null }], ok: true };
};

export const unpinCard = (cards, id) => cards.filter(card => card.id !== id);

export const moveCard = (cards, id, at) => cards.map(card => (card.id === id ? { ...card, at } : card));

// `at` holds x and y as fractions of the free space around the card, like PiP windows,
// so a card in a corner stays there when the grid changes size. Cards nobody has moved
// stack down from the top right.
export const cardPixels = (card, slot, grid, size = CARD_SIZE) => {
  const freeWidth = grid.width - size.width;
  const freeHeight = grid.height - size.height;
  if (card.at) {
    return { left: clamp(card.at.x, 0, 1) * Math.max(freeWidth, 0), top: clamp(card.at.y, 0, 1) * Math.max(freeHeight, 0) };
  }
  return {
    left: clamp(freeWidth - DEFAULT_INSET.right, 0, freeWidth),
    top: clamp(DEFAULT_INSET.top + slot * (size.height + CARD_GAP), 0, freeHeight)
  };
};

export const cardFractions = ({ left, top }, grid, size = CARD_SIZE) => {
  const freeWidth = grid.width - size.width;
  const freeHeight = grid.height - size.height;
  return {
    x: freeWidth > 0 ? clamp(left / freeWidth, 0, 1) : 0,
    y: freeHeight > 0 ? clamp(top / freeHeight, 0, 1) : 0
  };
};

// Live games for the ticker, hottest first
export const tickerRows = (rows) => rows
  .filter(row => isInPlay(row.game))
  .sort((a, b) => b.pulse.score - a.pulse.score);

// Seconds for one full crawl, so every game passes at the same reading speed
export const tickerDuration = (count) => Math.max(20, count * 7);
