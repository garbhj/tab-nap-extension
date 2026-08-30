export const DEFAULT_SETTINGS = {
  fallbackUrls: [
    // "https://www.google.com/*",
    "https://www.google.com",
    // "chrome://newtab/*",
    "chrome://newtab"
  ],
  skipDiscarded: true,        // toggle: do not jump to a tab that is already discarded
  jumpStrategy: "nearest"     // toggle: "nearest" | "mru"
};
