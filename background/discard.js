import { DEFAULT_SETTINGS } from '../shared/constants.js';
import { isFallbackTab, isRestrictedUrl } from '../shared/url.js'
import { generateSleepingFavicon } from '../favicon/generate.js';
import { injectFavicon, waitForFaviconUpdate } from '../favicon/inject.js'

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Redirects from activeTab to one of allTabs that is not in targetTabs, while following settings
export async function handleActiveTabFocus(activeTab, allTabs, targetTabs, settings) {
  // const activeSettings = settings || await getSettings();
  const targetTabIds = new Set(targetTabs.map(t => t.id));

  const availableTabs = allTabs.filter(t => {
      if (targetTabIds.has(t.id)) return false;
      if (settings.skipDiscarded && t.discarded) return false; // Skip discarded tabs if enabled
      return isFallbackTab(t.url, settings.fallbackUrls);
  });

  if (availableTabs.length > 0) {
      if (settings.jumpStrategy === "nearest") {
      availableTabs.sort((a, b) => Math.abs(a.index - activeTab.index) - Math.abs(b.index - activeTab.index));
      } 
      // TODO: other strategies: nearest left, nearest right, left, right, mru, random
      
      await chrome.tabs.update(availableTabs[0].id, { active: true });
  } else {
    await chrome.tabs.create({ windowId: activeTab.windowId, active: true });
  }
}

export async function discardTabs(targetTabs) {
    const discardPromises = targetTabs.map(async (targetTab) => {
    if (!targetTab.id) return;

    try {  // Inject favicon
      if (!isRestrictedUrl(targetTab.url)) {
        const sleepingIconDataUrl = await generateSleepingFavicon(targetTab.url);
        
        // Set up listener for changeInfo.favIconUrl on Chrome's part: before injection to avoid race conditions 
        const updatePromise = waitForFaviconUpdate(targetTab.id, 1000);

        await chrome.scripting.executeScript({
          target: { tabId: targetTab.id },
          func: injectFavicon,
          args: [sleepingIconDataUrl]
        });

        const updateFired = await updatePromise; 
        if (updateFired) await delay(500);  // Needed due to updatePromise not actually registering.
      }
    } catch (err) {
      console.warn(`Failed to inject favicon for tab ID ${targetTab.id}:`, err);
    }

    try {  // Discard tab
      await chrome.tabs.discard(targetTab.id);
    } catch (err) {
      console.warn(`Failed to discard tab ID ${targetTab.id}:`, err);
    }
  });

  await Promise.all(discardPromises);
}