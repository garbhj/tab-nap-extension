// Single source of truth for enum-like settings.
// Logic (background/), validation (storage.js) and UI (options/) all import from here.
// Add a new option by adding one entry to the enum + one entry to SETTING_OPTIONS.

export const JumpStrategy = Object.freeze({
  NEAREST: "nearest",
  LEFT: "left",
  RIGHT: "right",
  FIRST: "first",
  LAST: "last",
});

export const ReplaceFaviconMode = Object.freeze({
  OFF: "off",
  SAFE: "safe",
  RELAXED: "relaxed",
  TRY_ALL: "try-all",
});

export const SleepingFaviconStyle = Object.freeze({
  DOT: "dot",
  SHRUNK: "shrunk",
});

export const SETTING_OPTIONS = Object.freeze({
  jumpStrategy: Object.freeze([
    { value: JumpStrategy.NEAREST, label: "Nearest", desc: "Closest fallback tab to the discarded one." },
    { value: JumpStrategy.LEFT, label: "Left", desc: "Nearest fallback tab to the left." },
    { value: JumpStrategy.RIGHT, label: "Right", desc: "Nearest fallback tab to the right." },
    { value: JumpStrategy.FIRST, label: "First", desc: "Leftmost fallback tab." },
    { value: JumpStrategy.LAST, label: "Last", desc: "Rightmost fallback tab." },
  ]),
  replaceFaviconMode: Object.freeze([
    { value: ReplaceFaviconMode.OFF, label: "Off", desc: "Don't replace favicons." },
    { value: ReplaceFaviconMode.SAFE, label: "Standard", desc: "Replace all except built-in and default icons." },
    { value: ReplaceFaviconMode.RELAXED, label: "Relaxed", desc: "Replace default icons too; skip built-in pages." },
    { value: ReplaceFaviconMode.TRY_ALL, label: "Try all", desc: "Attempt replacement everywhere possible." },
  ]),
  sleepingFaviconStyle: Object.freeze([
    { value: SleepingFaviconStyle.DOT, label: "Faded + dot", desc: "Faded icon with a grey dot." },
    { value: SleepingFaviconStyle.SHRUNK, label: "Shrunk + dot", desc: "Smaller faded icon with a grey dot." },
  ]),
});

export const DEFAULT_SETTINGS = {
  fallbackUrls: [
    "https://www.google.com/*",
    "https://www.google.com",
    "chrome://newtab/*",
    "chrome://newtab"
  ],
  skipDiscarded: true,                          // do not jump to a tab that is already discarded
  jumpStrategy: JumpStrategy.NEAREST,
  replaceFaviconMode: ReplaceFaviconMode.SAFE,
  sleepingFaviconStyle: SleepingFaviconStyle.DOT,
};
