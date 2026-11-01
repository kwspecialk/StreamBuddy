// Runs in every frame. Applies the mute and volume the background worker hands
// it to the media elements in this frame, and keeps applying them.
(() => {
  // The app page itself has no players
  if (window === window.top) return;

  const MEDIA_SELECTOR = 'video, audio';
  const ENFORCE_EVENTS = ['volumechange', 'loadstart', 'loadedmetadata', 'canplay', 'play', 'playing'];
  const RESCAN_INTERVAL_MS = 1000;

  let state = null;
  let rescanTimer = null;
  let isScanQueued = false;

  // Media events and mutations don't cross shadow roots, so each root is watched itself
  const watchedRoots = new WeakSet();

  // Only HTML elements can host a shadow root, and the chrome.dom call throws on
  // anything else, such as the SVG icons in a player's controls
  const shadowRootOf = (element) => element instanceof HTMLElement
    ? chrome.dom.openOrClosedShadowRoot(element)
    : null;

  const collectMedia = (root, found = new Set()) => {
    root.querySelectorAll(MEDIA_SELECTOR).forEach((media) => found.add(media));
    root.querySelectorAll('*').forEach((element) => {
      const shadowRoot = shadowRootOf(element);
      if (!shadowRoot) return;
      watchRoot(shadowRoot);
      collectMedia(shadowRoot, found);
    });
    return found;
  };

  const enforce = (media) => {
    if (!state) return;
    if (state.muted && !media.muted) media.muted = true;
    if (typeof state.volume === 'number' && media.volume !== state.volume) media.volume = state.volume;
  };

  const enforceAll = () => {
    collectMedia(document).forEach(enforce);
  };

  const hasWorkToDo = () => state?.muted || typeof state?.volume === 'number';

  // Players add elements in bursts, so scan once per burst
  const queueScan = () => {
    if (isScanQueued) return;
    isScanQueued = true;
    setTimeout(() => {
      isScanQueued = false;
      if (hasWorkToDo()) enforceAll();
    }, 50);
  };

  const unmute = (media) => {
    const wasPlaying = !media.paused;
    media.muted = false;
    // Chrome can pause media unmuted without a gesture in this frame
    if (wasPlaying && media.paused) media.play().catch(() => {});
  };

  const handleMediaEvent = (event) => {
    if (event.target.matches?.(MEDIA_SELECTOR)) enforce(event.target);
  };

  const mutationObserver = new MutationObserver((mutations) => {
    if (!hasWorkToDo()) return;
    const hasNewElement = mutations.some(({ addedNodes }) =>
      Array.from(addedNodes).some((node) => node.nodeType === Node.ELEMENT_NODE)
    );
    if (hasNewElement) queueScan();
  });

  function watchRoot(root) {
    if (watchedRoots.has(root)) return;
    watchedRoots.add(root);
    ENFORCE_EVENTS.forEach((type) => root.addEventListener(type, handleMediaEvent, true));
    mutationObserver.observe(root, { childList: true, subtree: true });
  }

  const applyState = (nextState) => {
    const wasMuted = state?.muted;
    state = nextState;

    if (wasMuted && !state?.muted) collectMedia(document).forEach(unmute);
    if (hasWorkToDo()) enforceAll();

    // Events catch almost everything. The rescan catches the rest, such as a
    // player that swaps in a new element and assigns muted before it is attached.
    if (hasWorkToDo() && !rescanTimer) {
      rescanTimer = setInterval(enforceAll, RESCAN_INTERVAL_MS);
    } else if (!hasWorkToDo() && rescanTimer) {
      clearInterval(rescanTimer);
      rescanTimer = null;
    }
  };

  watchRoot(document);

  // The app page posts this to find out which frame an iframe element is.
  // Only the content script can answer, because only it can reach the worker,
  // which then learns this frame's id from the message sender.
  window.addEventListener('message', (event) => {
    if (event.source !== window.parent || event.data?.streamBuddyClaim === undefined) return;
    chrome.runtime.sendMessage({ type: 'claim-frame', token: event.data.streamBuddyClaim });
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'apply-state') applyState(message.state);
  });

  // Covers a frame that loads or reloads after the app set its state
  chrome.runtime.sendMessage({ type: 'frame-ready' }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response?.state) applyState(response.state);
  });
})();
