export function matchesPattern(url = "", pattern = "") {
  if (pattern.trim() === "*") return true;
  const regexPattern = "^" + pattern
    .trim()
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&") // Escape special regex chars
    .replace(/\*/g, ".*") + "$";           // Convert '*' wildcards
  return new RegExp(regexPattern, "i").test(url);
}

export function isFallbackTab(url, fallbackUrls) {
  return fallbackUrls.some(pattern => matchesPattern(url, pattern));
}

export const isRestrictedUrl = (urlString) => {
  try {
    const url = new URL(urlString);
    const restrictedSchemes = ['chrome:', 'edge:', 'about:', 'chrome-extension:'];
    return restrictedSchemes.includes(url.protocol);
  } catch {
    return true;
  }
};
