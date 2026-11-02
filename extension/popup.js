const checkbox = document.getElementById('popup-guard');

chrome.storage.local.get('popupGuardEnabled').then(({ popupGuardEnabled }) => {
  checkbox.checked = Boolean(popupGuardEnabled);
});

checkbox.addEventListener('change', () => {
  chrome.storage.local.set({ popupGuardEnabled: checkbox.checked });
});

// Chrome grants host permissions at install. Firefox lets people decline or
// revoke them, and without them no content script runs.
const ALL_SITES = { origins: ['<all_urls>'] };
const isFirefox = Boolean(chrome.runtime.getManifest().browser_specific_settings);

if (isFirefox) {
  const siteAccess = document.getElementById('site-access');

  chrome.permissions.contains(ALL_SITES).then((hasAccess) => {
    siteAccess.hidden = hasAccess;
  });

  document.getElementById('allow-site-access').addEventListener('click', () => {
    chrome.permissions.request(ALL_SITES).then((granted) => {
      siteAccess.hidden = granted;
    });
  });
}
