// Background service worker (MV3).
// Seeds default state on install and forwards toggle updates to active tabs.

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: "discard-tab-action",
    title: "Discard Selected Tabs",
    contexts: ["tab"] // Appears when right-clicking a tab strip entry
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "discard-tab-action" || !tab) return;

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
    // Look for empty google.com tabs not in the discard queue
    const isGoogleHome = (url = "") => url === "https://www.google.com/" || url === "https://www.google.com";
    const availableGoogleTabs = allTabs.filter(t => !targetTabIds.has(t.id) && isGoogleHome(t.url));

    if (availableGoogleTabs.length > 0) {
      // Find the nearest one by index distance
      availableGoogleTabs.sort((a, b) => Math.abs(a.index - activeTab.index) - Math.abs(b.index - activeTab.index));
      await chrome.tabs.update(availableGoogleTabs[0].id, { active: true });
    } else {
      // Otherwise, open a new tab at the rightmost position
      await chrome.tabs.create({ windowId, active: true });
    }
  }

  // Discard all targeted tabs
  for (const targetTab of targetTabs) {
    if (targetTab.id) {
      try {
        await chrome.tabs.discard(targetTab.id);
      } catch (err) {
        console.warn(`Failed to discard tab ID ${targetTab.id}:`, err);
      }
    }
  }
});
