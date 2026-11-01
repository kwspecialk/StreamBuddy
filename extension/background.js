// Holds which frame in each StreamBuddy tab is which stream. Frame ids and the
// frame tree come from Chrome, so nested players are found by walking up from
// a frame rather than by passing messages through pages we don't control.
const POPUP_GUARD_SCRIPT_ID = 'popup-guard';
const TOP_FRAME_ID = 0;

const tabKey = (tabId) => `tab-${tabId}`;

const getTabFrames = async (tabId) => {
  const key = tabKey(tabId);
  return (await chrome.storage.session.get(key))[key] || {};
};

// Returns the id of the claimed frame that frameId is, or sits inside
const findClaimedAncestor = (frameId, frameTree, tabFrames) => {
  const parents = new Map(frameTree.map((frame) => [frame.frameId, frame.parentFrameId]));
  for (let current = frameId; current !== undefined && current !== TOP_FRAME_ID; current = parents.get(current)) {
    if (tabFrames[current]) return current;
  }
  return null;
};

const sendToFrame = (tabId, frameId, message) =>
  // A frame with no content script yet will pick its state up in frame-ready
  chrome.tabs.sendMessage(tabId, message, { frameId }).catch(() => {});

const applyFrames = async (tabId, tabFrames, previousFrames) => {
  const frameTree = await chrome.webNavigation.getAllFrames({ tabId }) || [];
  frameTree.forEach(({ frameId }) => {
    const claimed = findClaimedAncestor(frameId, frameTree, tabFrames);
    const wasClaimed = findClaimedAncestor(frameId, frameTree, previousFrames);
    if (claimed !== null) {
      sendToFrame(tabId, frameId, { type: 'apply-state', state: tabFrames[claimed] });
    } else if (wasClaimed !== null) {
      sendToFrame(tabId, frameId, { type: 'apply-state', state: null });
    }
  });
};

const handleFrameReady = async ({ tab, frameId }) => {
  const tabFrames = await getTabFrames(tab.id);
  const frameTree = await chrome.webNavigation.getAllFrames({ tabId: tab.id }) || [];
  const claimed = findClaimedAncestor(frameId, frameTree, tabFrames);
  if (claimed !== null) return { state: tabFrames[claimed] };

  const isTopLevelStream = frameTree.find((frame) => frame.frameId === frameId)?.parentFrameId === TOP_FRAME_ID;
  if (isTopLevelStream) sendToFrame(tab.id, TOP_FRAME_ID, { type: 'unclaimed-frame' });
  return { state: null };
};

// Dragging a volume slider sends these quickly, and they must land in order
let setFramesQueue = Promise.resolve();

const handleSetFrames = (tabId, frames) => {
  setFramesQueue = setFramesQueue.then(async () => {
    const previousFrames = await getTabFrames(tabId);
    await chrome.storage.session.set({ [tabKey(tabId)]: frames });
    await applyFrames(tabId, frames, previousFrames);
  }).catch(() => {});
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!sender.tab) return false;

  if (message.type === 'frame-ready') {
    handleFrameReady(sender).then(sendResponse);
    return true;
  }
  if (message.type === 'claim-frame') {
    sendToFrame(sender.tab.id, TOP_FRAME_ID, {
      type: 'frame-claimed',
      token: message.token,
      frameId: sender.frameId
    });
  }
  if (message.type === 'set-frames' && sender.frameId === TOP_FRAME_ID) {
    handleSetFrames(sender.tab.id, message.frames);
  }
  return false;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(tabKey(tabId));
});

// Registered only while switched on, so with the option off nothing of ours
// runs in the page's main world for a source to detect.
const syncPopupGuard = async () => {
  const { popupGuardEnabled } = await chrome.storage.local.get('popupGuardEnabled');
  const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [POPUP_GUARD_SCRIPT_ID] });

  if (popupGuardEnabled && registered.length === 0) {
    await chrome.scripting.registerContentScripts([{
      id: POPUP_GUARD_SCRIPT_ID,
      js: ['popup-guard.js'],
      matches: ['<all_urls>'],
      allFrames: true,
      matchOriginAsFallback: true,
      runAt: 'document_start',
      world: 'MAIN'
    }]);
  } else if (!popupGuardEnabled && registered.length > 0) {
    await chrome.scripting.unregisterContentScripts({ ids: [POPUP_GUARD_SCRIPT_ID] });
  }
};

chrome.runtime.onInstalled.addListener(syncPopupGuard);
chrome.runtime.onStartup.addListener(syncPopupGuard);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.popupGuardEnabled) syncPopupGuard();
});
