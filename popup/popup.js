const STORAGE_KEY = 'ytShortsDislikeEnabled';  // TODO: replace
const settings = document.getElementById('settings-btn')
const toggle = document.getElementById('toggle');
const discardInactiveBtn = document.getElementById('discard-inactive')
const discardAllBtn = document.getElementById('discard-all')

function setUi(enabled) {
  toggle.setAttribute('aria-checked', String(enabled));
}

async function init() {
  const res = await chrome.storage.sync.get([STORAGE_KEY]);
  setUi(res[STORAGE_KEY] !== false);
}

discardAllBtn.addEventListener('click', async () => {
  const activeMemoryTabs = await chrome.tabs.query({ discarded: false });
  const tabCount = activeMemoryTabs.length;
  if (!confirm(`Discard all ${tabCount} tabs? You may lose unsaved data.`)) return;

  await chrome.runtime.sendMessage({ type: 'DISCARD_ALL' });
  window.close();
});

discardInactiveBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'DISCARD_INACTIVE' });
  window.close();
});

toggle.addEventListener('click', async () => {
  const next = toggle.getAttribute('aria-checked') !== 'true';
  await chrome.storage.sync.set({ [STORAGE_KEY]: next });
  setUi(next);
});

settings.addEventListener('click', () => {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options.html'));
  }
});


init();
