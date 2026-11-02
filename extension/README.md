# StreamBuddy Companion (prototype)

Chrome extension that adds per-stream mute to StreamBuddy. The page can't reach into cross-origin
players, but a content script running inside each frame can.

## Install

1. Open `chrome://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and choose this `extension/` folder.
3. Reload any open StreamBuddy tab. Content scripts only reach pages loaded after install.

After changing the extension, click its reload icon on `chrome://extensions`, then reload the
StreamBuddy tab. Bump `version` in `manifest.json` and run `npm run package-extension` to refresh the
zip that the app's `/extension` page offers for download.

## Firefox

`npm run package-extension-firefox` writes `public/streambuddy-companion-firefox.zip` from this same
folder. `scripts/package-firefox-extension.js` derives the manifest from `manifest.json`, so there is
no separate copy to maintain: it swaps `background.service_worker` for `background.scripts` and adds
the gecko id, and the JS is shared. Bump `version` here and run both package scripts.

- Load it from `about:debugging#/runtime/this-firefox` > **Load Temporary Add-on**, choosing the zip.
  It's unsigned, so release Firefox drops it on restart. A permanent install needs signing through
  an addons.mozilla.org account, which hasn't been done. Signing will fix the gecko id for good.
- Firefox lets people decline or revoke host permissions, and without them no content script runs.
  The toolbar popup then shows an **Allow access to all sites** button. Chrome never shows it.
- `chrome.dom` doesn't exist in Firefox, so `media-control.js` falls back to the
  `element.openOrClosedShadowRoot` property. `web-ext lint` warns about the `chrome.dom` call, which
  is expected.
- Popup blocking relies on `location.ancestorOrigins`, which older Firefox lacks. Without it
  `popup-guard.js` stops early, so `window.open` is left alone and the option does nothing.

## Try it

1. Open StreamBuddy with at least two streams, in any layout. Mute buttons appear when you hover a
   stream, and stay visible on muted streams. Without the extension there are no buttons.
2. Mute one stream. Only that stream goes quiet.
3. Unmute it from the player's own controls. It should mute again at once.
4. Reload the player (Manage > refresh, or change source). It should come back muted.
5. Reload the page. The same streams should stay muted.

Local testing note: with `npm start`, streams saved in `localStorage` load blank after a page reload,
with or without the extension. React StrictMode runs the unmount cleanup in `App.js` that sets
`iframe.src = ''`. Test step 5 on a production build or the deployed site.

## Popup blocking

Off by default. Turn it on from the extension's toolbar popup, then reload the streams. It replaces
`window.open` in frames inside StreamBuddy only, and when off nothing runs in the page's main world.
It reduces popups but won't stop them all: links with `target="_blank"` and redirects still get
through. If a source refuses to play, turn it off.

## How it works

- `app-bridge.js` runs in the StreamBuddy page. The app posts its per-stream state to it, and it finds
  each stream's iframe through the `data-streambuddy-stream` attribute.
- To learn which frame an iframe is, the bridge posts a random token to it. The frame's content script
  sends the token to the worker, which reads the frame id from the sender. That still works after
  redirects, when URLs no longer match.
- `background.js` keeps a frame id to state map in `chrome.storage.session`, so it survives the worker
  stopping. Frame ids don't change when a frame reloads, and nested frames are matched by walking
  up Chrome's frame tree.
- `media-control.js` runs in every frame. A frame that loads asks the worker for its state, then
  re-applies it on media events, DOM changes and a 1 second rescan while muted.

Per-stream volume sliders are in the app's Manage modal. The app posts `{ muted, volume }` per stream,
with volume from 0 to 1 and left out until someone sets one.

## Limits

- While a stream is muted or has a volume set, the player's own controls won't stick. Use StreamBuddy's.
- On a full page load a stream can play briefly before the mute arrives, because the app has to start
  first. A player reload doesn't have this gap.
- Audio from a `<video>` never added to the page, or from Web Audio, can't be reached.
- The bridge only runs on `localhost`, `127.0.0.1` and `streambuddy.cc` with its subdomains. To use
  another domain, add it to `manifest.json` and to `APP_ORIGIN` in `popup-guard.js`.
