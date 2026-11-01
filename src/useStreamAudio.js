import { useCallback, useEffect, useState } from 'react';

const MUTED_STORAGE_KEY = 'savedMutedStreams';
const VOLUME_STORAGE_KEY = 'savedStreamVolumes';
const APP_SOURCE = 'streambuddy-app';
const EXTENSION_SOURCE = 'streambuddy-extension';
const EXTENSION_CHECK_MS = 1500;

// Refreshing a stream adds a refresh_id, which shouldn't lose its audio settings
export const getStreamKey = (url) => url.split(/[?&]refresh_id=/)[0];

const loadSaved = (storageKey) => {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch (error) {
    return {};
  }
};

const postToExtension = (message) => {
  window.postMessage({ source: APP_SOURCE, ...message }, window.location.origin);
};

const without = (object, key) => {
  const { [key]: removed, ...others } = object;
  return others;
};

// isCheckDone turns true once a missing extension has had time to answer
export const useCompanionExtension = () => {
  const [hasExtension, setHasExtension] = useState(false);
  const [isCheckDone, setIsCheckDone] = useState(false);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.source === window && event.data?.source === EXTENSION_SOURCE) {
        setHasExtension(true);
      }
    };

    window.addEventListener('message', handleMessage);
    postToExtension({ type: 'ping' });
    const checkTimer = setTimeout(() => setIsCheckDone(true), EXTENSION_CHECK_MS);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(checkTimer);
    };
  }, []);

  return { hasExtension, isCheckDone };
};

// Mute and volume need the companion extension, because the page can't reach into
// cross-origin players. Without it hasExtension stays false and nothing is sent.
const useStreamAudio = (urls) => {
  const { hasExtension, isCheckDone } = useCompanionExtension();
  const [mutedStreams, setMutedStreams] = useState(() => loadSaved(MUTED_STORAGE_KEY));
  const [streamVolumes, setStreamVolumes] = useState(() => loadSaved(VOLUME_STORAGE_KEY));

  // Sends every stream each time, so a remounted iframe gets picked up too
  useEffect(() => {
    if (!hasExtension) return;

    const streams = {};
    urls.forEach((url) => {
      const key = getStreamKey(url);
      streams[key] = { muted: Boolean(mutedStreams[key]), volume: streamVolumes[key] };
    });
    postToExtension({ type: 'set-streams', streams });
  }, [hasExtension, urls, mutedStreams, streamVolumes]);

  useEffect(() => {
    if (!hasExtension) return;
    localStorage.setItem(MUTED_STORAGE_KEY, JSON.stringify(mutedStreams));
    localStorage.setItem(VOLUME_STORAGE_KEY, JSON.stringify(streamVolumes));
  }, [hasExtension, mutedStreams, streamVolumes]);

  const isMuted = (url) => Boolean(mutedStreams[getStreamKey(url)]);

  // Streams nobody has set a volume on are left at whatever the player chose
  const getVolume = (url) => streamVolumes[getStreamKey(url)] ?? 1;

  const toggleMute = (url) => {
    const key = getStreamKey(url);
    setMutedStreams((prev) => (prev[key] ? without(prev, key) : { ...prev, [key]: true }));
  };

  // Moving the slider on a muted stream should be heard, so it unmutes too
  const setVolume = (url, volume) => {
    const key = getStreamKey(url);
    setStreamVolumes((prev) => ({ ...prev, [key]: volume }));
    setMutedStreams((prev) => without(prev, key));
  };

  // For a stream that changes URL but is still the same stream, like a new source
  const moveStream = useCallback((fromUrl, toUrl) => {
    const fromKey = getStreamKey(fromUrl);
    const toKey = getStreamKey(toUrl);
    const move = (prev) => (fromKey in prev
      ? { ...without(prev, fromKey), [toKey]: prev[fromKey] }
      : prev);
    setMutedStreams(move);
    setStreamVolumes(move);
  }, []);

  const forgetStream = useCallback((url) => {
    const key = getStreamKey(url);
    setMutedStreams((prev) => without(prev, key));
    setStreamVolumes((prev) => without(prev, key));
  }, []);

  const forgetAllStreams = useCallback(() => {
    setMutedStreams({});
    setStreamVolumes({});
  }, []);

  return {
    hasExtension,
    isCheckDone,
    isMuted,
    getVolume,
    toggleMute,
    setVolume,
    moveStream,
    forgetStream,
    forgetAllStreams
  };
};

export default useStreamAudio;
