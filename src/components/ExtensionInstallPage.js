import React from 'react';
import { CheckCircle, Download } from 'lucide-react';
import { useCompanionExtension } from '../useStreamAudio';
import { EXTENSION_FIREFOX_ZIP_PATH, EXTENSION_ZIP_PATH, isFirefoxBrowser } from '../extensionInfo';
import './ExtensionInstallPage.css';

const FEATURES = [
  'Mute and set the volume of each stream separately',
  'Keeps your settings when a player reloads or tries to unmute itself',
  'Optional popup blocking for the embedded players'
];

const ExtensionInstallPage = () => {
  const { hasExtension } = useCompanionExtension();

  return (
    <main className="extension-page">
      <a href="/" className="extension-page__logo">
        <img src="/logo.png" alt="StreamBuddy" />
      </a>

      <h1>StreamBuddy Companion</h1>
      <p className="extension-page__lead">
        A free browser extension that gives StreamBuddy control over the sound of each stream.
      </p>

      {hasExtension ? (
        <p className="extension-page__installed">
          <CheckCircle size={18} /> The extension is installed and working.
        </p>
      ) : (
        <a
          className="btn btn--md btn--primary extension-page__download"
          href={isFirefoxBrowser() ? EXTENSION_FIREFOX_ZIP_PATH : EXTENSION_ZIP_PATH}
          download
        >
          <Download size={16} />
          <span>Download extension</span>
        </a>
      )}

      <section>
        <h2>What it adds</h2>
        <ul>
          {FEATURES.map(feature => <li key={feature}>{feature}</li>)}
        </ul>
      </section>

      <section>
        <h2>How to install on Chrome, Edge or Brave</h2>
        <p>Works on desktop Chrome, Edge and Brave. It isn't on the Chrome Web Store, so it's a manual install.</p>
        <ol>
          <li>Download the extension, then unzip it. Keep the folder somewhere permanent, because deleting it removes the extension.</li>
          <li>Paste <code>chrome://extensions</code> into your address bar and press Enter.</li>
          <li>Turn on <strong>Developer mode</strong> in the top right corner.</li>
          <li>Click <strong>Load unpacked</strong> and choose the unzipped folder.</li>
          <li>Reload your StreamBuddy tab. Mute buttons appear when you hover over a stream, and volume sliders appear under Manage.</li>
        </ol>
      </section>

      <section>
        <h2>How to install on Firefox</h2>
        <p>Works on desktop Firefox 140 or newer. Not on Firefox for Android.</p>
        <p className="extension-page__notice">
          <strong>On Firefox the install is temporary.</strong> Firefox only keeps add-ons that Mozilla has signed, and this one isn't signed yet. It stays until you close Firefox, then you need to repeat steps 2 to 5.
        </p>
        <a className="btn btn--md btn--secondary extension-page__download" href={EXTENSION_FIREFOX_ZIP_PATH} download>
          <Download size={16} />
          <span>Download for Firefox</span>
        </a>
        <ol>
          <li>Download the Firefox version. You don't need to unzip it, but keep the file for next time.</li>
          <li>Paste <code>about:debugging#/runtime/this-firefox</code> into your address bar and press Enter.</li>
          <li>Click <strong>Load Temporary Add-on</strong>.</li>
          <li>Choose the file you downloaded.</li>
          <li>Reload your StreamBuddy tab. Mute buttons appear when you hover over a stream, and volume sliders appear under Manage.</li>
        </ol>
        <p>
          If the buttons don't appear or don't change the sound, click the extensions button in your toolbar, open StreamBuddy Companion and choose <strong>Allow access to all sites</strong>, then reload the tab.
        </p>
      </section>

      <section>
        <h2>Good to know</h2>
        <ul>
          <li>Your browser asks for access to all sites because stream players come from many different domains. The extension only acts on players inside StreamBuddy.</li>
          <li>While a stream is muted or has a volume set here, the player's own controls won't change it. Use StreamBuddy's controls instead.</li>
          <li>To block popups, click the extension's icon in your toolbar and tick the box. If a source refuses to play, turn it off again. On Firefox this needs a recent version, and does nothing on older ones.</li>
        </ul>
      </section>
    </main>
  );
};

export default ExtensionInstallPage;
