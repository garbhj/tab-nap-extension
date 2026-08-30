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

export const isRestrictedUrl = (url) => url.startsWith("chrome://") || url.startsWith("edge://");
