// Runs in the top frame of the StreamBuddy page. Takes the app's per-stream
// state from window.postMessage and works out which frame each stream is.
(() => {
  const APP_SOURCE = 'streambuddy-app';
  const EXTENSION_SOURCE = 'streambuddy-extension';
  const STREAM_ATTRIBUTE = 'data-streambuddy-stream';

  let streams = {};
  const frameIds = new WeakMap();
  const pendingClaims = new Map();

  const announce = () => window.postMessage({
    source: EXTENSION_SOURCE,
    type: 'ready',
    version: chrome.runtime.getManifest().version
  }, window.location.origin);

  const pushFrames = () => {
    const frames = {};
    document.querySelectorAll(`[${STREAM_ATTRIBUTE}]`).forEach((container) => {
      const state = streams[container.getAttribute(STREAM_ATTRIBUTE)];
      const frameId = frameIds.get(container.querySelector('iframe'));
      if (state && frameId !== undefined) frames[frameId] = state;
    });
    chrome.runtime.sendMessage({ type: 'set-frames', frames });
  };

  // The token goes to the frame through its own window, so whichever frame
  // answers with it is that iframe, wherever it redirected to.
  const claimUnknownFrames = () => {
    pendingClaims.clear();
    document.querySelectorAll(`[${STREAM_ATTRIBUTE}] iframe`).forEach((iframe) => {
      if (frameIds.has(iframe) || !iframe.contentWindow) return;
      const token = crypto.randomUUID();
      pendingClaims.set(token, iframe);
      iframe.contentWindow.postMessage({ streamBuddyClaim: token }, '*');
    });
  };

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.data?.source !== APP_SOURCE) return;

    if (event.data.type === 'ping') announce();

    if (event.data.type === 'set-streams') {
      streams = event.data.streams;
      claimUnknownFrames();
      pushFrames();
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'frame-claimed') {
      const iframe = pendingClaims.get(message.token);
      if (!iframe) return;
      pendingClaims.delete(message.token);
      frameIds.set(iframe, message.frameId);
      pushFrames();
    }

    if (message.type === 'unclaimed-frame') claimUnknownFrames();
  });

  announce();
})();
