const checkbox = document.getElementById('popup-guard');

chrome.storage.local.get('popupGuardEnabled').then(({ popupGuardEnabled }) => {
  checkbox.checked = Boolean(popupGuardEnabled);
});

checkbox.addEventListener('change', () => {
  chrome.storage.local.set({ popupGuardEnabled: checkbox.checked });
});
