import React from 'react';
import { CheckCircle, Download } from 'lucide-react';
import { useCompanionExtension } from '../useStreamAudio';
import { EXTENSION_ZIP_PATH } from '../extensionInfo';
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
        <a className="btn btn--md btn--primary extension-page__download" href={EXTENSION_ZIP_PATH} download>
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
        <h2>How to install</h2>
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
        <h2>Good to know</h2>
        <ul>
          <li>Chrome asks for access to all sites because stream players come from many different domains. The extension only acts on players inside StreamBuddy.</li>
          <li>While a stream is muted or has a volume set here, the player's own controls won't change it. Use StreamBuddy's controls instead.</li>
          <li>To block popups, click the extension's icon in your toolbar and tick the box. If a source refuses to play, turn it off again.</li>
        </ul>
      </section>
    </main>
  );
};

export default ExtensionInstallPage;
