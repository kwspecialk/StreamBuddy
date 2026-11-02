import React, { useState } from 'react';
import { canFullscreenPage } from '../deviceProfile';

const DISMISSED_KEY = 'streamNoticeDismissed';

// Players are third-party, and their ads can't be blocked from this page on a phone
const StreamNotice = () => {
  const [isDismissed, setIsDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === 'true'
  );

  if (isDismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setIsDismissed(true);
  };

  return (
    <div className="stream-notice" role="status">
      <p>
        <strong>Players are run by third parties.</strong> Tapping one can open ads in a new tab,
        including 18+ ads. Close them and come back here. It can take a few taps to start.
        {!canFullscreenPage && " Use the player's own button for fullscreen."}
      </p>
      <p>A browser with built-in ad blocking may reduce these.</p>
      <button className="btn btn--md btn--primary" onClick={handleDismiss}>Got it</button>
    </div>
  );
};

export default StreamNotice;
