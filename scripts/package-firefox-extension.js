// Builds the Firefox package from extension/, so both browsers share one set of
// source files. Only the manifest differs, and it is derived here so the two
// can't drift apart.
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'extension');
const OUTPUT_PATH = path.join(ROOT, 'public', 'streambuddy-companion-firefox.zip');
const EXCLUDED_FILES = new Set(['README.md', '.DS_Store']);

const GECKO_SETTINGS = {
  id: 'companion@streambuddy.cc',
  strict_min_version: '140.0',
  data_collection_permissions: { required: ['none'] }
};

const toFirefoxManifest = ({ minimum_chrome_version, background, ...manifest }) => ({
  ...manifest,
  background: { scripts: [background.service_worker] },
  browser_specific_settings: { gecko: GECKO_SETTINGS }
});

const stageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'streambuddy-firefox-'));

try {
  fs.cpSync(SOURCE_DIR, stageDir, {
    recursive: true,
    filter: (source) => !EXCLUDED_FILES.has(path.basename(source))
  });

  const manifestPath = path.join(stageDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  fs.writeFileSync(manifestPath, `${JSON.stringify(toFirefoxManifest(manifest), null, 2)}\n`);

  fs.rmSync(OUTPUT_PATH, { force: true });
  execFileSync('zip', ['-r', '-q', OUTPUT_PATH, '.'], { cwd: stageDir });
  console.log(`Wrote ${path.relative(ROOT, OUTPUT_PATH)}`);
} finally {
  fs.rmSync(stageDir, { recursive: true, force: true });
}
