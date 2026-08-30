// Background service worker (MV3).
// Seeds default state on install and forwards toggle updates to active tabs.

import { DEFAULT_SETTINGS } from '../shared/constants.js';
import { isFallbackTab, isRestrictedUrl } from '../shared/url.js'
import { generateSleepingFavicon } from '../favicon/generate.js';
import { injectFavicon, waitForFaviconUpdate } from '../favicon/inject.js'

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