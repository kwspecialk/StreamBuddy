import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import ScoreCards from './ScoreCards';

const row = {
  game: {
    id: '9',
    league: 'nfl',
    status: 'live',
    clock: '4th 8:18',
    teams: [{ abbr: 'BAL', name: 'Baltimore Ravens', score: '17' }, { abbr: 'BUF', name: 'Buffalo Bills', score: '20' }]
  },
  pulse: { score: 60 }
};

describe('ScoreCards', () => {
  beforeAll(() => {
    global.ResizeObserver = class { observe() {} disconnect() {} };
    Element.prototype.setPointerCapture = () => {};
    // jsdom has no PointerEvent, so pointer events would arrive without button or clientX
    if (!window.PointerEvent) window.PointerEvent = class extends MouseEvent {};
  });

  it('ends a drag when the card goes away mid-drag', () => {
    const onDragChange = jest.fn();
    const props = { isCompact: false, openId: null, onOpenChange: () => {}, onMove: () => {}, onUnpin: () => {}, onDragChange, menuProps: {} };
    const { rerender } = render(<ScoreCards {...props} entries={[{ card: { id: '9', at: null }, row }]} />);

    const card = screen.getByTitle('Drag or use the arrow keys to move');
    fireEvent.pointerDown(card, { button: 0, clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(card, { clientX: 40, clientY: 40, pointerId: 1 });
    expect(onDragChange).toHaveBeenLastCalledWith(true);

    rerender(<ScoreCards {...props} entries={[]} />);
    expect(onDragChange).toHaveBeenLastCalledWith(false);
  });
});
