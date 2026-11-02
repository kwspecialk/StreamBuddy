import { useLayoutEffect, useRef, useState } from 'react';
import { deviceType } from './deviceProfile';

const STORAGE_KEY = 'savedPipPositions';
const ASPECT_RATIO = 16 / 9;
const MIN_WIDTH = deviceType === 'phone' ? 140 : 200;
const DEFAULT_WIDTH = 0.24;
const DEFAULT_ROWS = 3;
const DEFAULT_SPACING = 0.33;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// x and y are fractions of the free space around the window, so a window in a
// corner stays in that corner when the grid changes size (e.g. fullscreen).
// width is a fraction of the grid width.
// Windows the user hasn't moved stack up from the bottom right, column by column.
const getDefaultPosition = (slot) => ({
  x: Math.max(0.98 - Math.floor(slot / DEFAULT_ROWS) * DEFAULT_SPACING, 0),
  y: 0.96 - (slot % DEFAULT_ROWS) * DEFAULT_SPACING,
  width: DEFAULT_WIDTH
});

const loadPositions = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (error) {
    return {};
  }
};

const toPixels = (position, grid) => {
  const maxWidth = Math.min(grid.width, grid.height * ASPECT_RATIO);
  const width = clamp(position.width * grid.width, Math.min(MIN_WIDTH, maxWidth), maxWidth);
  const height = width / ASPECT_RATIO;
  return {
    left: position.x * (grid.width - width),
    top: position.y * (grid.height - height),
    width,
    height
  };
};

const fromPixels = ({ left, top, width }, grid) => {
  const freeWidth = grid.width - width;
  const freeHeight = grid.height - width / ASPECT_RATIO;
  return {
    x: freeWidth > 0 ? left / freeWidth : 0,
    y: freeHeight > 0 ? top / freeHeight : 0,
    width: width / grid.width
  };
};

const usePipWindow = (isEnabled) => {
  const [gridElement, setGridElement] = useState(null);
  const [gridSize, setGridSize] = useState(null);
  const [positions, setPositions] = useState(loadPositions);
  const [frontSlot, setFrontSlot] = useState(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const positionsRef = useRef(positions);

  useLayoutEffect(() => {
    if (!gridElement || !isEnabled) return;

    const measure = () => setGridSize({
      width: gridElement.clientWidth,
      height: gridElement.clientHeight
    });

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(gridElement);
    return () => observer.disconnect();
  }, [gridElement, isEnabled]);

  const getPosition = (slot) => positionsRef.current[slot] || getDefaultPosition(slot);

  const trackPointer = (event, slot, onMove) => {
    event.preventDefault();
    const handle = event.currentTarget;
    const startX = event.clientX;
    const startY = event.clientY;

    const handleMove = (moveEvent) => {
      const next = {
        ...positionsRef.current,
        [slot]: onMove(moveEvent.clientX - startX, moveEvent.clientY - startY)
      };
      positionsRef.current = next;
      setPositions(next);
    };

    const handleEnd = () => {
      handle.removeEventListener('pointermove', handleMove);
      handle.removeEventListener('pointerup', handleEnd);
      handle.removeEventListener('pointercancel', handleEnd);
      setIsInteracting(false);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(positionsRef.current));
    };

    handle.setPointerCapture(event.pointerId);
    handle.addEventListener('pointermove', handleMove);
    handle.addEventListener('pointerup', handleEnd);
    handle.addEventListener('pointercancel', handleEnd);
    setFrontSlot(slot);
    setIsInteracting(true);
  };

  const startDrag = (event, slot) => {
    const grid = gridSize;
    const start = toPixels(getPosition(slot), grid);

    trackPointer(event, slot, (deltaX, deltaY) => fromPixels({
      left: clamp(start.left + deltaX, 0, grid.width - start.width),
      top: clamp(start.top + deltaY, 0, grid.height - start.height),
      width: start.width
    }, grid));
  };

  // corner is one of 'nw', 'ne', 'sw', 'se'; the opposite corner stays put
  const startResize = (event, slot, corner) => {
    const grid = gridSize;
    const start = toPixels(getPosition(slot), grid);
    const right = start.left + start.width;
    const bottom = start.top + start.height;
    const directionX = corner.includes('e') ? 1 : -1;
    const directionY = corner.includes('s') ? 1 : -1;
    const maxWidth = Math.min(
      directionX > 0 ? grid.width - start.left : right,
      (directionY > 0 ? grid.height - start.top : bottom) * ASPECT_RATIO
    );

    trackPointer(event, slot, (deltaX, deltaY) => {
      const growth = Math.max(deltaX * directionX, deltaY * directionY * ASPECT_RATIO);
      const width = clamp(start.width + growth, Math.min(MIN_WIDTH, maxWidth), maxWidth);
      return fromPixels({
        left: directionX > 0 ? start.left : right - width,
        top: directionY > 0 ? start.top : bottom - width / ASPECT_RATIO,
        width
      }, grid);
    });
  };

  const getStyle = (slot) => gridSize
    ? { ...toPixels(getPosition(slot), gridSize), zIndex: slot === frontSlot ? 2 : 1 }
    : undefined;

  return {
    gridRef: setGridElement,
    isInteracting,
    getStyle,
    startDrag,
    startResize
  };
};

export default usePipWindow;
