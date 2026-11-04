import React, { useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import useMediaQuery from '../useMediaQuery';
import { gameLabel, statusText } from '../utils/scoreboard';
import { tickerDuration } from '../utils/scoreCards';
import './ScoreCards.css';

// What an empty ticker says, by the scores feed's status
const EMPTY_TEXT = {
  loading: 'Loading scores…',
  ok: 'No games are live right now',
  failed: 'Scores aren’t available right now'
};

const TickerItems = ({ rows, onOpenGame, isCopy }) => (
  <ul className="score-ticker__items" aria-hidden={isCopy || undefined}>
    {rows.map(({ game }) => (
      <li key={game.id}>
        <button
          type="button"
          className="score-ticker__item"
          tabIndex={isCopy ? -1 : undefined}
          aria-label={isCopy ? undefined : `${gameLabel(game)}, ${game.teams.map(team => team.score).join(' to ')}, ${statusText(game)}. Open in scores`}
          onClick={() => onOpenGame(game.id)}
        >
          <span className="score-ticker__league">{game.league}</span>
          {game.teams.map(team => (
            <span key={team.abbr} className="score-ticker__team">
              {team.abbr} <b>{team.score}</b>
            </span>
          ))}
          <span className="score-ticker__clock">{statusText(game)}</span>
        </button>
      </li>
    ))}
  </ul>
);

// A thin strip of live games along the bottom, hottest first. It crawls only when the games
// don't fit, pauses on hover or focus, and scrolls by hand instead for reduced motion.
const ScoreTicker = ({ rows, scoresStatus, onOpenGame, onClose }) => {
  const viewportRef = useRef(null);
  const itemsRef = useRef(null);
  const [overflows, setOverflows] = useState(false);
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const isCrawling = overflows && !prefersReducedMotion;

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const items = itemsRef.current;
    if (!viewport || !items) return undefined;
    const measure = () => setOverflows(items.scrollWidth > viewport.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(items.firstChild || items);
    return () => observer.disconnect();
  }, [rows.length]);

  return (
    <div className="score-ticker" role="region" aria-label="Live scores ticker">
      <span className="score-ticker__label">Live</span>
      <div className="score-ticker__viewport" ref={viewportRef}>
        {rows.length === 0 ? (
          <p className="score-ticker__empty">{EMPTY_TEXT[scoresStatus] || EMPTY_TEXT.ok}</p>
        ) : (
          <div
            className={`score-ticker__track${isCrawling ? ' score-ticker__track--crawling' : ''}`}
            style={{ '--ticker-duration': `${tickerDuration(rows.length)}s` }}
          >
            <div ref={itemsRef}>
              <TickerItems rows={rows} onOpenGame={onOpenGame} />
            </div>
            {isCrawling && <TickerItems rows={rows} onOpenGame={onOpenGame} isCopy />}
          </div>
        )}
      </div>
      <button type="button" className="score-ticker__close" aria-label="Turn off ticker" onClick={onClose}>
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
};

export default ScoreTicker;
