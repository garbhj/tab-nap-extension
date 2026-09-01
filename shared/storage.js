// storage.js: Wrapper around chrome.storage.sync

import { DEFAULT_SETTINGS } from "./constants.js";

// Helper for merging src into tgt without needlessly mutating nested values in tgt
export function merge(tgt, src) {
  const result = { ...tgt };
  for (const key of Object.keys(src)) {
    const tgtVal = tgt[key];
    const srcVal = src[key];

    // Case 1: Two non-atomic values
    if (srcVal && typeof srcVal === "object"
    && tgtVal && typeof tgtVal === "object"
    && !Array.isArray(srcVal)
    ) {
      result[key] = merge(tgtVal, srcVal);
    } else if (srcVal !== undefined) {
      result[key] = srcVal;  // Note: fallbackUrls is directly assigned, be careful
    }
  }
  return result;
}

export async function getSettings() {
  const stored = await chrome.storage.sync.get();
  return merge(DEFAULT_SETTINGS, stored);
}

export async function updateSettings(options) {
  const currentSettings = await getSettings();
  await chrome.storage.sync.set(merge(currentSettings, options));
}

export async function resetSettings() {
  await chrome.storage.sync.set(DEFAULT_SETTINGS);
}

export function onSettingsChange(callback) {
  const listener = async (changes, areaName) => {
    if (areaName !== "sync") return;
    
    const freshSettings = await getSettings();
    callback(freshSettings, changes);
  };

  chrome.storage.onChanged.addListener(listener);
  // Cleanup unsubscribe function
  return () => chrome.storage.onChanged.removeListener(listener);
}