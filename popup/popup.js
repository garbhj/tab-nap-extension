const STORAGE_KEY = 'ytShortsDislikeEnabled';
const toggle = document.getElementById('toggle');

function setUi(enabled) {
  toggle.setAttribute('aria-checked', String(enabled));
}

async function init() {
  const res = await chrome.storage.sync.get([STORAGE_KEY]);
  setUi(res[STORAGE_KEY] !== false);
}

toggle.addEventListener('click', async () => {
  const next = toggle.getAttribute('aria-checked') !== 'true';
  await chrome.storage.sync.set({ [STORAGE_KEY]: next });
  setUi(next);
});

init();
