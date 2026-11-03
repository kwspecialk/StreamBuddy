// Where the scores drawer goes on a desktop. Docking beside the streams shrinks them, so it
// docks only when that costs the main stream little or nothing (a wide screen with black bars
// to spare, or a dual layout that can stack). Otherwise it floats over the streams, which
// keep their size.
const ASPECT = 16 / 9;
export const DRAWER_WIDTH = { min: 360, max: 440 };
export const DOCK_MIN_SCREEN = 1024;
const MAX_DOCK_LOSS = 0.1;

// The main stream's tile as a share of the grid, [width, height]
const MAIN_TILE = {
  single: [1, 1],
  pip: [1, 1],
  dual: [1 / 2, 1],
  triple: [2 / 3, 1],
  quad: [1 / 2, 1 / 2],
  'two-plus-four': [2 / 3, 1 / 2],
  'grid-3x3': [1 / 3, 1 / 3],
  'grid-5x2': [1 / 5, 1 / 2]
};
const STACKED_DUAL = [1, 1 / 2];

// Width of a 16:9 picture fitted into the tile
export const videoWidth = ([tileWidth, tileHeight], width, height) =>
  Math.min(tileWidth * width, tileHeight * height * ASPECT);

const OVERLAY = { mode: 'overlay', width: DRAWER_WIDTH.min, stackDual: false };

// `width` and `height` are the stream grid's size with the drawer closed. `prefer` is the
// viewer's own choice, 'dock' or 'float', and wins over the automatic one where docking fits.
export const drawerFit = ({ width, height, layout, prefer }) => {
  const tile = MAIN_TILE[layout];
  if (width < DOCK_MIN_SCREEN || height <= 0 || prefer === 'float') return OVERLAY;
  if (!tile) return prefer === 'dock' ? { ...OVERLAY, mode: 'dock' } : OVERLAY;

  const full = videoWidth(tile, width, height);
  // Grid width beyond what the main picture needs is black bars the drawer can take for free
  const spare = width - full / tile[0];
  if (spare >= DRAWER_WIDTH.min) return { mode: 'dock', width: Math.min(Math.floor(spare), DRAWER_WIDTH.max), stackDual: false };

  const narrower = width - DRAWER_WIDTH.min;
  const sideBySide = videoWidth(tile, narrower, height);
  const stacked = layout === 'dual' ? videoWidth(STACKED_DUAL, narrower, height) : 0;
  const best = Math.max(sideBySide, stacked);
  if (prefer !== 'dock' && 1 - best / full > MAX_DOCK_LOSS) return OVERLAY;
  return { mode: 'dock', width: DRAWER_WIDTH.min, stackDual: stacked > sideBySide };
};
