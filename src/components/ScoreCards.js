import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useEscapeKey } from '../useModalBehavior';
import { gameLabel, statusText } from '../utils/scoreboard';
import { isInPlay, leaderOf } from '../utils/gamePulse';
import { CARD_SIZE, cardFractions, cardPixels } from '../utils/scoreCards';
import { GameMenu, PulseMeter } from './ScoreboardDrawer';
import './ScoreCards.css';

// A press that moves less than this is a click, not a drag
const DRAG_THRESHOLD_PX = 4;
const MENU_WIDTH = 300;

const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

const CardTeam = ({ team, game, leader }) => (
  <span className={`score-card__team${leader && leader !== team.abbr ? ' score-card__team--trailing' : ''}`}>
    <span className="score-card__swatch" style={{ background: team.color || 'var(--color-dark-border)' }} />
    <span className="score-card__abbr">{team.abbr}</span>
    {game.situation?.possession === team.abbr && <span className="score-card__possession" title="Has the ball" />}
    <span className="score-card__score">{game.status === 'pre' ? '' : team.score}</span>
  </span>
);

const CardStatus = ({ game }) => (
  <span className={`score-card__status${game.status === 'live' ? ' score-card__status--live' : ''}`}>{statusText(game)}</span>
);

// Closes the open menu on a press anywhere outside `ref`
const usePressOutside = (ref, isActive, onPress) => {
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  useEffect(() => {
    if (!isActive) return undefined;
    const handlePointerDown = (event) => {
      if (!ref.current?.contains(event.target)) onPressRef.current();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [ref, isActive]);
};

const CardMenu = ({ row, menuProps, onClose, onUnpin, className, style }) => (
  <div className={`score-card-menu ${className}`} style={style} role="dialog" aria-label={`${gameLabel(row.game)} actions`}>
    <p className="score-card-menu__title">{gameLabel(row.game)}</p>
    <GameMenu
      row={row}
      {...menuProps}
      onWatchNow={(...args) => { onClose(); menuProps.onWatchNow(...args); }}
      onAdd={(...args) => { onClose(); menuProps.onAdd(...args); }}
      onReplace={(...args) => { onClose(); menuProps.onReplace(...args); }}
      isPinned
      onTogglePin={() => { onClose(); onUnpin(row.game.id); }}
    />
  </div>
);

// The menu sits inside the card, so these offsets are from the card. It opens below the
// card, or above it in the lower half, and slides sideways to stay inside the grid.
const menuStyle = (position, grid) => {
  const gap = 6;
  const left = clamp(position.left + CARD_SIZE.width - MENU_WIDTH, 0, grid.width - MENU_WIDTH) - position.left;
  const isBelow = position.top + CARD_SIZE.height / 2 < grid.height / 2;
  return isBelow
    ? { width: MENU_WIDTH, left, top: CARD_SIZE.height + gap, maxHeight: grid.height - position.top - CARD_SIZE.height - 2 * gap }
    : { width: MENU_WIDTH, left, bottom: CARD_SIZE.height + gap, maxHeight: position.top - 2 * gap };
};

const FloatingCard = ({ entry, slot, grid, isOpen, onOpenChange, onMove, onUnpin, onDragChange, menuProps }) => {
  const { card, row } = entry;
  const { game, pulse } = row;
  const [dragPosition, setDragPosition] = useState(null);
  const wasDraggedRef = useRef(false);
  const cardRef = useRef(null);
  const label = gameLabel(game);
  const leader = game.status === 'pre' ? null : leaderOf(game);
  const position = dragPosition || cardPixels(card, slot, grid);

  usePressOutside(cardRef, isOpen, () => onOpenChange(null));

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    const handle = event.currentTarget;
    const start = { x: event.clientX, y: event.clientY, ...position };
    let isDragging = false;
    let latest = position;
    wasDraggedRef.current = false;

    const handleMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - start.x;
      const deltaY = moveEvent.clientY - start.y;
      if (!isDragging && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX) return;
      if (!isDragging) {
        isDragging = true;
        wasDraggedRef.current = true;
        onOpenChange(null);
        onDragChange(true);
      }
      latest = {
        left: clamp(start.left + deltaX, 0, grid.width - CARD_SIZE.width),
        top: clamp(start.top + deltaY, 0, grid.height - CARD_SIZE.height)
      };
      setDragPosition(latest);
    };

    const handleEnd = () => {
      handle.removeEventListener('pointermove', handleMove);
      handle.removeEventListener('pointerup', handleEnd);
      handle.removeEventListener('pointercancel', handleEnd);
      if (!isDragging) return;
      onDragChange(false);
      onMove(card.id, cardFractions(latest, grid));
      setDragPosition(null);
    };

    handle.setPointerCapture(event.pointerId);
    handle.addEventListener('pointermove', handleMove);
    handle.addEventListener('pointerup', handleEnd);
    handle.addEventListener('pointercancel', handleEnd);
  };

  return (
    <div
      ref={cardRef}
      className={`score-card${dragPosition ? ' score-card--dragging' : ''}${isOpen ? ' score-card--open' : ''}`}
      style={{ left: position.left, top: position.top, width: CARD_SIZE.width, height: CARD_SIZE.height }}
    >
      <button
        type="button"
        className="score-card__body"
        aria-label={`${label}, ${game.teams.map(team => `${team.name || team.abbr} ${team.score ?? ''}`).join(', ')}, ${statusText(game)}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title="Click for options · drag to move"
        onPointerDown={handlePointerDown}
        onClick={() => {
          if (wasDraggedRef.current) return;
          onOpenChange(isOpen ? null : game.id);
        }}
      >
        <span className="score-card__top">
          <span className="score-card__league">{game.league}</span>
          <CardStatus game={game} />
        </span>
        {game.teams.map(team => <CardTeam key={team.abbr} team={team} game={game} leader={leader} />)}
        <span className="score-card__pulse">{isInPlay(game) && <PulseMeter value={pulse.score} />}</span>
      </button>
      <button type="button" className="icon-btn score-card__close" aria-label={`Close ${label} card`} onClick={() => onUnpin(card.id)}>
        <X size={14} strokeWidth={2} />
      </button>
      {isOpen && (
        <CardMenu
          row={row}
          menuProps={menuProps}
          onClose={() => onOpenChange(null)}
          onUnpin={onUnpin}
          className="score-card-menu--floating"
          style={menuStyle(position, grid)}
        />
      )}
    </div>
  );
};

// Phones: one row of small chips along the top, with the menu dropping down under them
const CompactStrip = ({ entries, openId, onOpenChange, onUnpin, menuProps }) => {
  const stripRef = useRef(null);
  const openRow = entries.find(entry => entry.card.id === openId)?.row;

  usePressOutside(stripRef, Boolean(openRow), () => onOpenChange(null));

  return (
    <div className="score-strip" ref={stripRef}>
      <div className="score-strip__chips">
        {entries.map(({ card, row }) => {
          const { game, pulse } = row;
          const leader = game.status === 'pre' ? null : leaderOf(game);
          return (
            <button
              key={card.id}
              type="button"
              className="score-chip"
              aria-expanded={openId === card.id}
              aria-haspopup="dialog"
              aria-label={`${gameLabel(game)}, ${statusText(game)}`}
              onClick={() => onOpenChange(openId === card.id ? null : card.id)}
            >
              {game.teams.map(team => (
                <span key={team.abbr} className={`score-chip__team${leader && leader !== team.abbr ? ' score-chip__team--trailing' : ''}`}>
                  <span className="score-card__swatch" style={{ background: team.color || 'var(--color-dark-border)' }} />
                  {team.abbr} <b>{game.status === 'pre' ? '' : team.score}</b>
                </span>
              ))}
              <CardStatus game={game} />
              {isInPlay(game) && <span className="score-chip__pulse" style={{ width: `${pulse.score}%` }} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {openRow && (
        <CardMenu
          row={openRow}
          menuProps={menuProps}
          onClose={() => onOpenChange(null)}
          onUnpin={onUnpin}
          className="score-card-menu--strip"
        />
      )}
    </div>
  );
};

// Moved cards stay where they were put, so only unmoved ones take a place in the stack
const stackSlot = (entries, index) => entries.slice(0, index).filter(entry => !entry.card.at).length;

// Pinned games floating over the stream grid. Rendered inside the grid so cards move with it.
const ScoreCards = ({ entries, isCompact, openId, onOpenChange, onMove, onUnpin, onDragChange, menuProps }) => {
  const layerRef = useRef(null);
  const [grid, setGrid] = useState(null);

  useEscapeKey(Boolean(openId), () => onOpenChange(null));

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer || isCompact) return undefined;
    const measure = () => setGrid({ width: layer.clientWidth, height: layer.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(layer);
    return () => observer.disconnect();
  }, [isCompact, entries.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  if (entries.length === 0) return null;

  if (isCompact) {
    return <CompactStrip entries={entries} openId={openId} onOpenChange={onOpenChange} onUnpin={onUnpin} menuProps={menuProps} />;
  }

  return (
    <div className="score-cards" ref={layerRef}>
      {grid && entries.map((entry, index) => (
        <FloatingCard
          key={entry.card.id}
          entry={entry}
          slot={stackSlot(entries, index)}
          grid={grid}
          isOpen={openId === entry.card.id}
          onOpenChange={onOpenChange}
          onMove={onMove}
          onUnpin={onUnpin}
          onDragChange={onDragChange}
          menuProps={menuProps}
        />
      ))}
    </div>
  );
};

export default ScoreCards;
