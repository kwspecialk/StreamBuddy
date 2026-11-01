import React from 'react';
import './MatchScore.css';

const formatStart = (ms) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const hasPoints = (team) => team.score !== null && team.score !== '';

const getBadgeText = (score) => (score.status === 'pre' ? `Starts ${formatStart(score.start)}` : score.clock);

// The badge on a match thumbnail. `className` is the badge style of the card it sits on.
export const MatchStatusBadge = ({ match, className }) => {
  const { score } = match;
  if (!score) return <div className={`${className} pulse`}>● LIVE</div>;

  return (
    <div className={`${className} match-status match-status--${score.status} ${score.status === 'live' ? 'pulse' : ''}`}>
      {getBadgeText(score)}
    </div>
  );
};

const TeamRow = ({ team, showScore, isTrailing }) => (
  <div className={`match-team ${isTrailing ? 'match-team--trailing' : ''}`}>
    <span className="match-team__name">{team.name}</span>
    {showScore && <span className="match-team__score">{team.score}</span>}
  </div>
);

// Title and sport for a match card. Unmatched cards keep the plain title.
export const MatchInfo = ({ match, title, sport }) => {
  const { score } = match;
  if (!score) {
    return (
      <>
        <h3>{title}</h3>
        <p>{sport}</p>
      </>
    );
  }

  const [first, second] = score.teams;
  const showScores = score.status !== 'pre' && hasPoints(first) && hasPoints(second);
  const difference = Number(first.score) - Number(second.score);

  return (
    <>
      <h3 className="match-teams" aria-label={title}>
        <TeamRow team={first} showScore={showScores} isTrailing={showScores && difference < 0} />
        <TeamRow team={second} showScore={showScores} isTrailing={showScores && difference > 0} />
      </h3>
      <p className="match-sport">{sport}</p>
      {score.odds && (
        <p className="match-odds">
          <span className="match-odds__label">Pre-game odds</span>
          <span className="match-odds__values">
            <span>{score.odds.line}</span>
            {score.odds.total !== null && <span>O/U {score.odds.total}</span>}
          </span>
        </p>
      )}
    </>
  );
};
