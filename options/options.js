import { getSettings, updateSettings, resetSettings } from '../shared/storage.js';

const jumpStrategyEl = document.getElementById('jumpStrategy');
const skipDiscardedEl = document.getElementById('skipDiscarded');
const fallbackUrlsEl = document.getElementById('fallbackUrls');
const resetEl = document.getElementById('reset');
const statusEl = document.getElementById('status');

let saveTimer = null;

function showStatus(message) {
  statusEl.textContent = message;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { statusEl.textContent = ''; }, 1500);
}

function toLines(list) {
  return (list || []).join('\n');
}

function fromLines(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

async function init() {
  const settings = await getSettings();
  jumpStrategyEl.value = settings.jumpStrategy;
  skipDiscardedEl.checked = Boolean(settings.skipDiscarded);
  fallbackUrlsEl.value = toLines(settings.fallbackUrls);
}

jumpStrategyEl.addEventListener('change', async () => {
  await updateSettings({ jumpStrategy: jumpStrategyEl.value });
  showStatus('Saved');
});

skipDiscardedEl.addEventListener('change', async () => {
  await updateSettings({ skipDiscarded: skipDiscardedEl.checked });
  showStatus('Saved');
});

// Save fallback patterns on blur / change (avoids writing half-typed lines on every keystroke).
fallbackUrlsEl.addEventListener('change', async () => {
  await updateSettings({ fallbackUrls: fromLines(fallbackUrlsEl.value) });
  // Normalize display (trims whitespace, drops blank lines).
  fallbackUrlsEl.value = toLines(fromLines(fallbackUrlsEl.value));
  showStatus('Saved');
});

resetEl.addEventListener('click', async () => {
  await resetSettings();
  await init();
  showStatus('Reset to defaults');
});

init();
