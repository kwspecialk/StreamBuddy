import React, { useState } from 'react';
import { CircleHelp, RefreshCw, Shuffle, ArrowUpToLine } from 'lucide-react';

// Players are cross-origin, so the app can't tell when one fails. People need a way to act.
const StreamHelp = ({ showEndedHint, onReload, onNextSource, onMakeMain }) => {
  const [isOpen, setIsOpen] = useState(false);

  const runAction = (action) => {
    setIsOpen(false);
    action();
  };

  return (
    <div className="stream-help">
      <button
        className="stream-help__toggle"
        aria-label="Stream options"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        <CircleHelp size={18} />
      </button>
      {isOpen && (
        <div className="stream-help__menu">
          {showEndedHint && <p>This game may have ended.</p>}
          <button onClick={() => runAction(onReload)}>
            <RefreshCw size={16} /> Reload stream
          </button>
          {onNextSource && (
            <button onClick={() => runAction(onNextSource)}>
              <Shuffle size={16} /> Try next source
            </button>
          )}
          {onMakeMain && (
            <button onClick={() => runAction(onMakeMain)}>
              <ArrowUpToLine size={16} /> Make main stream
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default StreamHelp;
