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

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
  // Using Chrome's internial favicon API
  const favUrl = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=32`;
  const response = await fetch(favUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  
  const canvas = new OffscreenCanvas(32, 32);
  const ctx = canvas.getContext('2d');

  // Default appearance: grey dot, shrunk faded logo
  ctx.filter = "saturate(0.3)";
  ctx.globalAlpha = 0.5;
  ctx.drawImage(bitmap, 0, 0, 32, 32);  // or 4, 4, 24, 24
  
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.fillStyle="rgb(170, 170, 170)";
  ctx.arc(28, 28, 5, 0, 2*Math.PI);
  ctx.fill();
  
  // canvas -> blob -> base64 data URL
  const outBlob = await canvas.convertToBlob({ type: 'image/png' });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(outBlob);
  });
}

// Function injected into the tab to update the DOM
function injectFavicon(dataUrl) {
  try {
    const existingIcons = document.querySelectorAll("link[rel*='icon']");
    existingIcons.forEach(el => el.remove());

    const link = document.createElement("link");
    link.type = "image/png";
    link.rel = "icon";
    link.href = dataUrl;
    document.head.appendChild(link);

    console.log("[Extension] Sleeping favicon successfully injected.");
    return { success: true, countRemoved: existingIcons.length };
  } catch (err) {
    console.error("[Extension] Failed to inject favicon:", err);
    return { success: false, error: err.message };
  }
}

function waitForFaviconUpdate(tabId, timeoutMs = 1000) {
  return new Promise((resolve) => {
    let timer;
    const startTime = performance.now();

    const listener = (updatedTabId, changeInfo) => {
      // When the browser registers the new favicon, it fires this event
      if (updatedTabId === tabId && changeInfo.favIconUrl) {
        chrome.tabs.onUpdated.removeListener(listener);
        clearTimeout(timer);
        const elapsed = performance.now() - startTime;
        console.log(`Favicon updated in ${elapsed.toFixed(2)}ms`);
        resolve(true);
      }
    };
    
    chrome.tabs.onUpdated.addListener(listener);
    
    // Fallback timeout just in case the event fails to fire
    timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(false); 
    }, timeoutMs);
  });
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

  // Process all targeted tabs in parallel
  const discardPromises = targetTabs.map(async (targetTab) => {
    if (!targetTab.id) return;

    try {  // to inject the favicon
      if (!isRestrictedlUrl(targetTab.url)) {
        const sleepingIconDataUrl = await generateSleepingFavicon(targetTab.url);
        
        // Set up listener for changeInfo.favIconUrl on Chrome's part: before injection to avoid race conditions 
        const updatePromise = waitForFaviconUpdate(targetTab.id, 1000);

        await chrome.scripting.executeScript({
          target: { tabId: targetTab.id },
          func: injectFavicon,
          args: [sleepingIconDataUrl]
        });

        const updateFired = await updatePromise; 
        if (updateFired) await delay(500);  // being conservative
      }
    } catch (err) {
      console.warn(`Failed to inject favicon for tab ID ${targetTab.id}:`, err);
    }

    try {  // to discard the tab
      await chrome.tabs.discard(targetTab.id);
    } catch (err) {
      console.warn(`Failed to discard tab ID ${targetTab.id}:`, err);
    }
  });

  await Promise.all(discardPromises);
});