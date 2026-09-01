// Background service worker (MV3).
// Seeds default state on install and forwards toggle updates to active tabs.

import { getSettings } from '../shared/storage.js';
import { handleActiveTabFocus, discardTabs } from './discard.js';

chrome.runtime.onInstalled.addListener(async () => {
  // Seed default settings on initial install without overwriting user choices on update
  const mergedSettings = await getSettings();
  await chrome.storage.sync.set(mergedSettings);

  chrome.contextMenus.create({
    id: "discard-tab-action",
    title: "Discard Selected Tabs",
    contexts: ["tab"] // Appears when right-clicking a tab strip entry
  });
});


chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "discard-tab-action" || !tab) return;

  const settings = await getSettings();

  const windowId = tab.windowId;
  const allTabs = await chrome.tabs.query({ windowId });

  // Target the whole selection if clicked within it; otherwise target only the clicked tab
  const highlightedTabs = allTabs.filter(t => t.highlighted);
  const isTargetInSelection = highlightedTabs.some(t => t.id === tab.id);
  const targetTabs = isTargetInSelection ? highlightedTabs : [tab];

  // Check if the currently active tab is about to be discarded
  const activeTab = targetTabs.find(t => t.active);

  if (activeTab) {
    await handleActiveTabFocus(activeTab, allTabs, targetTabs, settings);
  }

  // Discard all targeted tabs
  await discardTabs(targetTabs);
});