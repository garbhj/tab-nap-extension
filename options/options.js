import { SETTING_OPTIONS } from '../shared/constants.js';
import { getSettings, updateSettings, resetSettings } from '../shared/storage.js';

const jumpStrategyEl = document.getElementById('jumpStrategy');
const replaceFaviconModeEl = document.getElementById('replaceFaviconMode');
const sleepingFaviconStyleEl = document.getElementById('sleepingFaviconStyle');
const skipDiscardedEl = document.getElementById('skipDiscarded');
const fallbackUrlsEl = document.getElementById('fallbackUrls');
const resetEl = document.getElementById('reset');
const statusEl = document.getElementById('status');

const ENUM_SELECTS = [
  [jumpStrategyEl, 'jumpStrategy'],
  [replaceFaviconModeEl, 'replaceFaviconMode'],
  [sleepingFaviconStyleEl, 'sleepingFaviconStyle'],
];

let saveTimer = null;

function showStatus(message) {
  statusEl.textContent = message;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { statusEl.textContent = ''; }, 1500);
}

// Render every enum dropdown from the shared registry (single source of truth).
function populateSelects() {
  for (const [selectEl, key] of ENUM_SELECTS) {
    selectEl.textContent = '';
    for (const { value, label, desc } of SETTING_OPTIONS[key]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      if (desc) option.title = desc;
      selectEl.appendChild(option);
    }
  }
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
  const settings = await getSettings();  // NOTE: getSettings() sanitizes, so values always match an <option>
  jumpStrategyEl.value = settings.jumpStrategy;
  replaceFaviconModeEl.value = settings.replaceFaviconMode;
  sleepingFaviconStyleEl.value = settings.sleepingFaviconStyle;
  skipDiscardedEl.checked = Boolean(settings.skipDiscarded);
  fallbackUrlsEl.value = toLines(settings.fallbackUrls);
}

for (const [selectEl, key] of ENUM_SELECTS) {
  selectEl.addEventListener('change', async () => {
    await updateSettings({ [key]: selectEl.value });
    showStatus('Saved');
  });
}

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

populateSelects();
init();
