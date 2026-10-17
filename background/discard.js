import { isRestrictedUrl } from "../shared/url.js";
import { ReplaceFaviconMode } from "../shared/constants.js";
import { generateSleepingFavicon } from "../favicon/generate.js";
import { getSettings } from "../shared/storage.js";
import { handleActiveTabFocus } from "./navigation.js";
import { injectFavicon, waitForFaviconUpdate } from "../favicon/inject.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function shouldReplaceFavicon(tab, mode) {
  // differentiate:
  //    OFF (skip all)
  //    SAFE (skip built-in/restricted + default globe icon)
  //    RELAXED (skip built-in/restricted, still try if default globe icon)
  //    TRY_ALL (skip none);
  if (mode === ReplaceFaviconMode.OFF) {
    return { allowed: false, reason: "Disabled" };
  }
  if (!tab.url) {  // safety
    return { allowed: false, reason: "Missing URL" };
  }
  if (isRestrictedUrl(tab.url) && mode !== ReplaceFaviconMode.TRY_ALL) {
    return { allowed: false, reason: "Restricted URL" };
  }
  if (!tab.favIconUrl && mode === ReplaceFaviconMode.SAFE) {
    // NOTE: !tab.favIconUrl is what is meant by "default globe icon" above;
    // generateSleepingFavicon() should still work as _favicon returns the default globe even with empty url,
    // but the altered favicon may be cached aggressively and never revert to the default after reloading.
    return { allowed: false, reason: "No favicon found" };
  }
  return { allowed: true };
}

async function applySleepingFavicon(tab, settings) {
  const eligibility = shouldReplaceFavicon(tab, settings.replaceFaviconMode);
  if (!eligibility.allowed) {
    console.log(`[Favicon] Skipping tab ${tab.id} (mode: ${settings.replaceFaviconMode}): ${eligibility.reason}`);
    return;
  }

  try {
    const iconDataUrl = await generateSleepingFavicon(tab.url, settings.sleepingFaviconStyle);
    if (!iconDataUrl) return;

    const updatePromise = waitForFaviconUpdate(tab.id, 1000);
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: injectFavicon,
      args: [iconDataUrl],
    });

    const updated = await updatePromise;
    if (updated) await delay(500);
  } catch (err) {
    console.warn(`[Favicon] Could not decorate tab ${tab.id}:`, err);
  }
}

/**
 * Main entry-point for discarding a list of tabs.
 * @param {*} targetTabs
 */
export async function discardTabs(tabs, customSettings = null) {
  if (!tabs || tabs.length === 0) return;
  const settings = customSettings || (await getSettings());
  await handleActiveTabFocus(tabs, settings);

  // Run tab discard operations in parallel
  await Promise.allSettled(tabs.map((tab) => discardSingleTab(tab, settings)));
}

export async function discardSingleTab(tab, settings) {
  if (!tab.id || tab.discarded) return;
  await applySleepingFavicon(tab, settings);
  try {
    await chrome.tabs.discard(tab.id);
  } catch (err) {
    console.warn(`[Discard] Failed to discard tab ${tab.id}:`, err);
  }
}

export async function discardInactiveTabs() {
  // TODO: Use settings instead of hardcoded
  const cutoffTime = Date.now() - 10 * 60 * 1000;

  const allTabs = await chrome.tabs.query({});
  const inactiveTabs = allTabs.filter(
    (tab) => !tab.active && !tab.discarded && !tab.audible && tab.lastAccessed < cutoffTime,
  );

  console.log(`[Discard] Discarding ${inactiveTabs.length} tabs (Inactive)`);
  await discardTabs(inactiveTabs);
}

export async function discardAllTabs() {
  const allTabs = await chrome.tabs.query({ discarded: false });
  console.log(`[Discard] Discarding ${allTabs.length} tabs (All)`);
  await discardTabs(allTabs);
}
