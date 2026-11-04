export const LAYOUTS = {
    'single': { name: '1', windows: 1 },
    'dual': { name: '2', windows: 2 },
    'pip': { name: 'PiP', windows: Infinity },
    'triple': { name: '3', windows: 3 },
    'quad': { name: '4', windows: 4 },
    'two-plus-four': { name: '6 (2+4)', windows: 6 },
    'grid-3x3': { name: '9 (3x3)', windows: 9 },
    'grid-5x2': { name: '10 (5x2)', windows: 10 },
    'grid-infinite': { name: '∞', windows: Infinity }
  };

// Phones and tablets can't decode many streams, and small players are unusable.
// Score cards sit over the streams, so smaller screens get fewer of them.
const DEVICE_LIMITS = {
    phone: { layouts: ['single', 'dual', 'pip'], maxStreams: 2, maxCards: 2 },
    tablet: { layouts: ['single', 'dual', 'pip', 'triple', 'quad'], maxStreams: 4, maxCards: 3 },
    desktop: { layouts: Object.keys(LAYOUTS), maxStreams: Infinity, maxCards: 4 }
  };

export const getAllowedLayouts = (device) => DEVICE_LIMITS[device].layouts;

export const getMaxStreams = (device, layout) =>
  Math.min(LAYOUTS[layout]?.windows || 1, DEVICE_LIMITS[device].maxStreams);

export const getDeviceMaxStreams = (device) => DEVICE_LIMITS[device].maxStreams;

export const getDeviceMaxCards = (device) => DEVICE_LIMITS[device].maxCards;
