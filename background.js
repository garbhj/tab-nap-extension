// Background service worker (MV3).
// Seeds default state on install and forwards toggle updates to active tabs.

const DEFAULT_SETTINGS = {
  fallbackUrls: [
    // "https://www.google.com/*",
    "https://www.google.com",
    // "chrome://newtab/*",
    "chrome://newtab"
  ],
  skipDiscarded: true,        // toggle: do not jump to a tab that is already discarded
  jumpStrategy: "nearest"     // toggle: "nearest" | "mru"
};

function matchesPattern(url = "", pattern = "") {
  if (pattern.trim() === "*") return true;
  const regexPattern = "^" + pattern
    .trim()
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&") // Escape special regex chars
    .replace(/\*/g, ".*") + "$";           // Convert '*' wildcards
  return new RegExp(regexPattern, "i").test(url);
}

function isFallbackTab(url, fallbackUrls) {
  return fallbackUrls.some(pattern => matchesPattern(url, pattern));
}

const isRestrictedlUrl = (url) => url.startsWith("chrome://") || url.startsWith("edge://");

chrome.runtime.onInstalled.addListener(async () => {
  // Seed default settings on initial install without overwriting user choices on update
  const current = await chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS));
  await chrome.storage.sync.set({ ...DEFAULT_SETTINGS, ...current });
  // await chrome.storage.sync.set(DEFAULT_SETTINGS);  // use this to override the default settings

  chrome.contextMenus.create({
    id: "discard-tab-action",
    title: "Discard Selected Tabs",
    contexts: ["tab"] // Appears when right-clicking a tab strip entry
  });
});

async function generateSleepingFavicon(pageUrl) {
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "discard-tab-action" || !tab) return;

  const settings = { ...DEFAULT_SETTINGS, ...(await chrome.storage.sync.get())};

  const windowId = tab.windowId;
  const allTabs = await chrome.tabs.query({ windowId });

  // Target the whole selection if clicked within it; otherwise target only the clicked tab
  const highlightedTabs = allTabs.filter(t => t.highlighted);
  const isTargetInSelection = highlightedTabs.some(t => t.id === tab.id);
  const targetTabs = isTargetInSelection ? highlightedTabs : [tab];
  const targetTabIds = new Set(targetTabs.map(t => t.id));

  // Check if the currently active tab is about to be discarded
  const activeTab = targetTabs.find(t => t.active);

if (activeTab) {
    const availableTabs = allTabs.filter(t => {
      if (targetTabIds.has(t.id)) return false;
      if (settings.skipDiscarded && t.discarded) return false; // Skip discarded tabs if enabled
      return isFallbackTab(t.url, settings.fallbackUrls);
    });

    if (availableTabs.length > 0) {
      if (settings.jumpStrategy === "nearest") {
        availableTabs.sort((a, b) => Math.abs(a.index - activeTab.index) - Math.abs(b.index - activeTab.index));
      } 
      // TODO: other strategies
      
      await chrome.tabs.update(availableTabs[0].id, { active: true });
    } else {
      await chrome.tabs.create({ windowId, active: true });
    }
  }
  // Discard all targeted tabs
  for (const targetTab of targetTabs) {
    if (targetTab.id) {
      try {
        if (!isRestrictedlUrl) {
          const sleepingIconDataUrl = await generateSleepingFavicon(targetTab.url);
          await chrome.scripting.executeScript({
            target: { tabId: targetTab.id },
            func: injectFavicon,
            args: [sleepingIconDataUrl]
          });
          await new Promise(resolve => setTimeout(resolve, 150));
        }

        await chrome.tabs.discard(targetTab.id);
      } catch (err) {
        console.warn(`Failed to discard tab ID ${targetTab.id}:`, err);
      }
    }
  }
});
