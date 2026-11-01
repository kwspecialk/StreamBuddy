import React, { useState } from 'react';
import { Puzzle, X } from 'lucide-react';
import { EXTENSION_PAGE_PATH } from '../extensionInfo';

const DISMISSED_KEY = 'extensionChipDismissed';

// Extensions only install on desktop Chromium browsers
const canInstallExtension = () =>
  Boolean(window.chrome) && !/Mobi|Android/i.test(navigator.userAgent);

const ExtensionChip = () => {
  const [isDismissed, setIsDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === 'true'
  );

  if (isDismissed || !canInstallExtension()) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setIsDismissed(true);
  };

  return (
    <div className="extension-chip" role="status">
      <Puzzle size={16} />
      {/* A new tab, so playing streams aren't interrupted */}
      <a href={EXTENSION_PAGE_PATH} target="_blank" rel="noopener noreferrer">
        Use the StreamBuddy extension for best results and full functionality
      </a>
      <button onClick={handleDismiss} title="Dismiss" aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
};

export default ExtensionChip;
