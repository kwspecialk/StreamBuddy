import { useEffect } from 'react';

// Keeps the screen on while watching. The browser drops the lock when the page is
// hidden, so it's requested again on return. Not every browser supports this.
const useWakeLock = (isEnabled) => {
  useEffect(() => {
    if (!isEnabled || !navigator.wakeLock) return;

    let lock = null;
    let isCancelled = false;

    const requestLock = async () => {
      if (document.hidden) return;
      try {
        const newLock = await navigator.wakeLock.request('screen');
        if (isCancelled) newLock.release();
        else lock = newLock;
      } catch (error) {
        // Refused, for example on low battery. The screen just sleeps as usual.
      }
    };

    requestLock();
    document.addEventListener('visibilitychange', requestLock);

    return () => {
      isCancelled = true;
      document.removeEventListener('visibilitychange', requestLock);
      lock?.release();
    };
  }, [isEnabled]);
};

export default useWakeLock;
