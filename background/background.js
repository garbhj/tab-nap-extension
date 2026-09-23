// Background service worker (MV3).
// Seeds default state on install and forwards toggle updates to active tabs.

import { getSettings } from '../shared/storage.js';
import { discardTabs, discardAllTabs, discardInactiveTabs } from './discard.js';

chrome.runtime.onInstalled.addListener(async () => {
  // Seed default settings on initial install without overwriting user choices on update
  const mergedSettings = await getSettings();
  await chrome.storage.sync.set(mergedSettings);

  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: "discard-tab-action",
    title: "Discard Selected Tabs",
    contexts: ["tab"] // Appears when right-clicking a tab strip entry
  });
});


chrome.contextMenus.onClicked.addListener(async (info, clickedTab) => {
  if (info.menuItemId !== "discard-tab-action" || !clickedTab) return;

  const windowTabs = await chrome.tabs.query({ windowId: clickedTab.windowId });
  const highlightedTabs = windowTabs.filter(t => t.highlighted);

  // Target the whole selection if clicked tab is within it; otherwise target only the clicked tab
  const isTargetInSelection = highlightedTabs.some(t => t.id === clickedTab.id);
  const targetTabs = isTargetInSelection ? highlightedTabs : [clickedTab];

  // Discard all targeted tabs
  await discardTabs(targetTabs);
});


chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
(async () => {
    try {
      console.log(`Received message: ${message?.type}`);
      
      switch (message?.type) {
        case 'DISCARD_ALL':
          await discardAllTabs();
          sendResponse({ success: true });
          break;

        case 'DISCARD_INACTIVE':
          await discardInactiveTabs();
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (err) {
      console.error(`Error handling ${message?.type}:`, err);
      sendResponse({ success: false, error: err.message });
    }
  })();
  
  return true;
})