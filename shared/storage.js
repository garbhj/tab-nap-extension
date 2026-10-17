import { DEFAULT_SETTINGS, SETTING_OPTIONS } from "./constants.js";

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

function sanitizeEnumValue(key, value) {
  const allowed = new Set(SETTING_OPTIONS[key].map((o) => o.value));
  return allowed.has(value) ? value : DEFAULT_SETTINGS[key];
}

// Ensure settings object valid (read path): unknown values fall back to defaults.
export function sanitizeSettings(settings) {
  return {
    ...settings,
    jumpStrategy: sanitizeEnumValue("jumpStrategy", settings.jumpStrategy),
    replaceFaviconMode: sanitizeEnumValue("replaceFaviconMode", settings.replaceFaviconMode),
    sleepingFaviconStyle: sanitizeEnumValue("sleepingFaviconStyle", settings.sleepingFaviconStyle),
    skipDiscarded: typeof settings.skipDiscarded === "boolean"
      ? settings.skipDiscarded
      : DEFAULT_SETTINGS.skipDiscarded,
    fallbackUrls: Array.isArray(settings.fallbackUrls)
      ? settings.fallbackUrls.filter((u) => typeof u === "string")
      : DEFAULT_SETTINGS.fallbackUrls,
  };
}

// Sanitize partial patch (write path): drop invalid enum entries and wrongly-typed fields.
export function sanitizePatch(patch) {
  const clean = {};
  for (const key of Object.keys(patch)) {
    const value = patch[key];
    if (value === undefined) continue;
    if (key in SETTING_OPTIONS) {
      if (new Set(SETTING_OPTIONS[key].map((o) => o.value)).has(value)) {
        clean[key] = value;
      }
    } else if (key === "skipDiscarded") {
      if (typeof value === "boolean") clean[key] = value;
    } else if (key === "fallbackUrls") {
      if (Array.isArray(value)) clean[key] = value.filter((u) => typeof u === "string");
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export async function getSettings() {
  const stored = await chrome.storage.sync.get();
  return sanitizeSettings(merge(DEFAULT_SETTINGS, stored));
}

export async function updateSettings(options) {
  const currentSettings = await getSettings();
  await chrome.storage.sync.set(merge(currentSettings, sanitizePatch(options)));
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
