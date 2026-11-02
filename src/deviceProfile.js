const PHONE_MAX_SCREEN_EDGE = 600;

const hasTouchScreen = () =>
  Boolean(window.matchMedia?.('(hover: none) and (pointer: coarse)').matches);

const getDeviceType = () => {
  if (!hasTouchScreen()) return 'desktop';
  return Math.min(window.screen.width, window.screen.height) < PHONE_MAX_SCREEN_EDGE ? 'phone' : 'tablet';
};

// The screen doesn't change while the app runs, even when the device rotates
export const deviceType = getDeviceType();
export const isTouchDevice = deviceType !== 'desktop';

// iPhone Safari has no element fullscreen, only each player's own button
export const canFullscreenPage = Boolean(document.documentElement.requestFullscreen);
