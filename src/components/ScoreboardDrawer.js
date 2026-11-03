import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Star, Pin } from 'lucide-react';
import { useEscapeKey } from '../useModalBehavior';
import { countFor, groupScoreboard, statusText } from '../utils/scoreboard';
import { isFollowedGame, isInPlay, leaderOf, teamKey } from '../utils/gamePulse';
import './ScoreboardDrawer.css';

const FILTER_LABELS = { live: 'Live', all: 'All today', following: 'Following' };

const pulseReasons = ({ game, pulse }) => [
  pulse.closeAndLate && 'Close and late',
  pulse.upset && 'underdog leading',
  game.situation?.redZone && `${game.situation.possession} in the red zone`,
  pulse.following && 'a team you follow'
].filter(Boolean);

// While the pointer is over the list, rows keep the order they had when it arrived,
// so a refresh can't move the row someone is about to click
const useFrozenOrder = (sections) => {
  const [isFrozen, setIsFrozen] = useState(false);
  const orderRef = useRef(new Map());

  const freeze = () => {
    orderRef.current = new Map(sections.flatMap(section => section.rows).map((row, index) => [row.game.id, index]));
    setIsFrozen(true);
  };

  const ordered = useMemo(() => {
    if (!isFrozen) return sections;
    const rank = (row) => orderRef.current.get(row.game.id) ?? Infinity;
    return sections.map(section => ({ ...section, rows: [...section.rows].sort((a, b) => rank(a) - rank(b)) }));
  }, [sections, isFrozen]);

  return { ordered, isFrozen, freeze, unfreeze: () => setIsFrozen(false) };
};

// A bar only: Pulse orders the games, the number itself isn't worth reading
export const PulseMeter = ({ value }) => (
  <span className="pulse-meter" role="img" aria-label={`Game Pulse ${value} of 100`} title="Game Pulse: how close and late it is">
    <span className="pulse-meter__track">
      <span className="pulse-meter__fill" style={{ width: `${value}%` }} />
    </span>
  </span>
);

const TeamLine = ({ team, game, isFollowed, isTrailing }) => (
  <span className={`scoreboard-team${isTrailing ? ' scoreboard-team--trailing' : ''}`}>
    <span className="scoreboard-team__swatch" style={{ background: team.color || 'var(--color-dark-border)' }} />
    <span className="scoreboard-team__name">{team.name}</span>
    {isFollowed && <Star className="scoreboard-team__star" size={12} fill="currentColor" aria-label="Following" />}
    {team.record && <span className="scoreboard-team__record">{team.record}</span>}
    {game.situation?.possession === team.abbr && <span className="scoreboard-team__possession" title="Has the ball" />}
    <span className="scoreboard-team__score">{game.status === 'pre' ? '' : team.score}</span>
  </span>
);

// Also opens from a score card, which leaves out pinning since the card's × unpins
export const GameMenu = ({ row, tiles, canAdd, follows, onWatchNow, onAdd, onReplace, onToggleFollow, isPinned, onTogglePin, id }) => {
  const { game, match, streamIndex, screenIndex } = row;
  const reasons = pulseReasons(row);
  const replaceTargets = tiles.filter(tile => tile.index !== screenIndex);

  return (
    <div className="scoreboard-menu" id={id}>
      {match ? (
        <>
          <div className="scoreboard-menu__actions">
            <button type="button" className="btn btn--primary btn--sm" disabled={screenIndex === 0} onClick={() => onWatchNow(row)}>
              {screenIndex === 0 ? 'Main stream' : 'Watch now'}
            </button>
            <button type="button" className="btn btn--secondary btn--sm" disabled={streamIndex >= 0 || !canAdd} onClick={() => onAdd(row)}>
              {screenIndex >= 0 ? 'On screen' : streamIndex >= 0 ? 'Already added' : 'Add to layout'}
            </button>
          </div>
          {replaceTargets.length > 0 && (
            <div className="scoreboard-menu__group">
              <span className="scoreboard-menu__label">{screenIndex >= 0 ? 'Swap with' : 'Replace'}</span>
              <div className="scoreboard-menu__tiles">
                {replaceTargets.map(tile => (
                  <button key={tile.index} type="button" className="btn btn--tertiary btn--xs" onClick={() => onReplace(row, tile.index)}>
                    <span className="scoreboard-menu__tile-number">{tile.index + 1}</span>
                    <span className="scoreboard-menu__tile-label">{tile.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {!canAdd && streamIndex < 0 && <p className="scoreboard-menu__note">This device is at its stream limit. Replace one instead.</p>}
        </>
      ) : (
        <p className="scoreboard-menu__note">No stream for this game yet. It shows up here as soon as one goes live.</p>
      )}
      <div className="scoreboard-menu__follow">
        {onTogglePin && (
          <button type="button" className="btn btn--ghost btn--xs scoreboard-menu__pin" aria-pressed={isPinned} onClick={() => onTogglePin(row)}>
            <Pin size={14} fill={isPinned ? 'currentColor' : 'none'} />
            {isPinned ? 'Unpin score card' : 'Pin score card'}
          </button>
        )}
        {game.teams.map(team => {
          const key = teamKey(game.league, team.abbr);
          const isFollowed = follows.has(key);
          return (
            <button key={key} type="button" className="btn btn--ghost btn--xs" aria-pressed={isFollowed} onClick={() => onToggleFollow(key)}>
              <Star size={14} fill={isFollowed ? 'currentColor' : 'none'} />
              {isFollowed ? 'Following' : 'Follow'} {team.name}
            </button>
          );
        })}
      </div>
      {isInPlay(game) && reasons.length > 0 && (
        <p className="scoreboard-menu__why">{reasons.join(', ')}</p>
      )}
    </div>
  );
};

const GameRow = ({ row, isOpen, onToggle, follows, isPinned, canDrag, onDragStateChange, onWatchNow, onAdd, onTogglePin, menuProps }) => {
  const { game, match, pulse, screenIndex } = row;
  const leader = game.status === 'pre' ? null : leaderOf(game);
  const isLive = game.status === 'live';

  const handleKeyDown = (event) => {
    if (event.key.toLowerCase() === 'p' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      onTogglePin(row);
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (!match) onToggle();
    else if (event.shiftKey) onAdd(row);
    else onWatchNow(row);
  };

  return (
    <li
      id={`scoreboard-row-${game.id}`}
      className={`scoreboard-row${isOpen ? ' scoreboard-row--open' : ''}${screenIndex >= 0 ? ' scoreboard-row--on-screen' : ''}`}
      draggable={canDrag && Boolean(match)}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', game.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragStateChange(row);
      }}
      onDragEnd={() => onDragStateChange(null)}
    >
      <button
        type="button"
        className="scoreboard-row__main"
        aria-expanded={isOpen}
        aria-controls={isOpen ? `scoreboard-menu-${game.id}` : undefined}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
      >
        <span className="scoreboard-row__teams">
          {game.teams.map(team => (
            <TeamLine
              key={team.abbr}
              team={team}
              game={game}
              isFollowed={follows.has(teamKey(game.league, team.abbr))}
              isTrailing={Boolean(leader) && leader !== team.abbr}
            />
          ))}
        </span>
        <span className="scoreboard-row__side">
          <span className={`scoreboard-row__status${isLive ? ' scoreboard-row__status--live' : ''}`}>{statusText(game)}</span>
          {isInPlay(game) && <PulseMeter value={pulse.score} />}
        </span>
        <span className="scoreboard-row__badges">
          {screenIndex >= 0 && <span className="score-badge score-badge--screen">{screenIndex === 0 ? 'Main stream' : `Stream ${screenIndex + 1}`}</span>}
          {pulse.closeAndLate && <span className="score-badge score-badge--close">Close &amp; late</span>}
          {pulse.upset && <span className="score-badge score-badge--upset">Upset watch</span>}
          {isPinned && <span className="score-badge score-badge--pinned"><Pin size={10} fill="currentColor" aria-hidden="true" />Card</span>}
          {!match && game.status !== 'final' && <span className="score-badge score-badge--none">No stream yet</span>}
        </span>
      </button>
      {isOpen && (
        <GameMenu
          row={row}
          id={`scoreboard-menu-${game.id}`}
          follows={follows}
          onWatchNow={onWatchNow}
          onAdd={onAdd}
          isPinned={isPinned}
          onTogglePin={onTogglePin}
          {...menuProps}
        />
      )}
    </li>
  );
};

const EMPTY_TEXT = {
  live: 'No games are live right now. Switch to All today to see what starts later.',
  all: 'No games today in the leagues we track.',
  following: 'Follow a team from any game and it shows up here.'
};

// The scores side panel in the stream view. A bottom sheet on phones.
const ScoreboardDrawer = ({
  isOpen,
  onClose,
  isEscapeBlocked,
  isFullscreen,
  isOverlay,
  rows,
  tiles,
  canAdd,
  canDrag,
  follows,
  onToggleFollow,
  onWatchNow,
  onAdd,
  onReplace,
  onDragStateChange,
  pinnedIds,
  onTogglePin,
  isTickerOn,
  onToggleTicker,
  focus
}) => {
  const [filter, setFilter] = useState('live');
  const [openGameId, setOpenGameId] = useState(null);
  const headingRef = useRef(null);

  const sections = useMemo(() => groupScoreboard(rows, filter, follows), [rows, filter, follows]);
  const { ordered, isFrozen, freeze, unfreeze } = useFrozenOrder(sections);

  useEscapeKey(isOpen && !isEscapeBlocked, () => {
    if (openGameId) setOpenGameId(null);
    else onClose();
  });

  useEffect(() => {
    if (isOpen) headingRef.current?.focus();
    else setOpenGameId(null);
  }, [isOpen]);

  // The ticker opens the drawer at one game: show its section, open its menu and focus it
  useEffect(() => {
    if (!focus) return undefined;
    const row = rows.find(r => r.game.id === focus.gameId);
    if (!row) return undefined;
    setFilter(isInPlay(row.game) ? 'live' : 'all');
    setOpenGameId(focus.gameId);
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById(`scoreboard-row-${focus.gameId}`);
      element?.scrollIntoView({ block: 'nearest' });
      element?.querySelector('.scoreboard-row__main')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
    // Only a new focus request should move the drawer, not every score refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  if (!isOpen) return null;

  const followedCount = rows.filter(row => isFollowedGame(row.game, follows)).length;
  const counts = { live: countFor(rows, 'live', follows), all: rows.length, following: followedCount };
  const closeMenuThen = (action) => (...args) => {
    setOpenGameId(null);
    action(...args);
  };

  return (
    <aside className={`scoreboard${isFullscreen ? ' scoreboard--fullscreen' : ''}${isOverlay ? ' scoreboard--overlay' : ''}`} aria-labelledby="scoreboard-title">
      <div className="scoreboard__header">
        <h2 className="scoreboard__title" id="scoreboard-title" tabIndex={-1} ref={headingRef}>Scores</h2>
        <div className="scoreboard__header-actions">
          <button type="button" className="scoreboard__filter scoreboard__ticker-toggle" aria-pressed={isTickerOn} onClick={onToggleTicker}>
            Ticker
          </button>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close scores">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="scoreboard__filters" role="group" aria-label="Show games">
        {Object.entries(FILTER_LABELS).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="scoreboard__filter"
            aria-pressed={filter === id}
            onClick={() => { setFilter(id); setOpenGameId(null); }}
          >
            {label}
            <span className="scoreboard__filter-count">{counts[id]}</span>
          </button>
        ))}
      </div>

      <div className="scoreboard__body" onPointerEnter={(event) => event.pointerType === 'mouse' && freeze()} onPointerLeave={unfreeze}>
        {ordered.length === 0 && <p className="scoreboard__empty">{rows.length === 0 ? 'Loading scores…' : EMPTY_TEXT[filter]}</p>}
        {ordered.map(section => (
          <section key={section.id} className="scoreboard__section" aria-label={section.label}>
            {filter !== 'live' && <h3 className="scoreboard__section-title">{section.label}</h3>}
            <ul className="scoreboard__list">
              {section.rows.map(row => (
                <GameRow
                  key={row.game.id}
                  row={row}
                  isOpen={openGameId === row.game.id}
                  onToggle={() => setOpenGameId(current => (current === row.game.id ? null : row.game.id))}
                  follows={follows}
                  isPinned={pinnedIds.has(row.game.id)}
                  onTogglePin={onTogglePin}
                  canDrag={canDrag}
                  onDragStateChange={onDragStateChange}
                  onWatchNow={closeMenuThen(onWatchNow)}
                  onAdd={closeMenuThen(onAdd)}
                  menuProps={{ tiles, canAdd, onReplace: closeMenuThen(onReplace), onToggleFollow }}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="scoreboard__hint">
        {isFrozen
          ? 'Order paused while you browse'
          : canDrag ? 'Enter to watch, Shift+Enter to add, P to pin a card. Drag a game onto a stream to replace it.' : 'Live games are ordered by how close and late they are'}
      </p>
    </aside>
  );
};

export default ScoreboardDrawer;
