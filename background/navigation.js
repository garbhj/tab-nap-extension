import { isFallbackTab } from "../shared/url.js";
import { JumpStrategy, DEFAULT_SETTINGS } from "../shared/constants.js";

const JUMP_STRATEGIES = {
  [JumpStrategy.NEAREST]: (candidates, activeTab) =>
    [...candidates].sort((a, b) => Math.abs(a.index - activeTab.index) - Math.abs(b.index - activeTab.index))[0],

  [JumpStrategy.LEFT]: (candidates, activeTab) => candidates.filter((t) => t.index < activeTab.index).pop(),

  [JumpStrategy.RIGHT]: (candidates, activeTab) => candidates.find((t) => t.index > activeTab.index),

  // Fallback default
  [JumpStrategy.FIRST]: (candidates) => candidates[0],

  [JumpStrategy.LAST]: (candidates) => candidates[candidates.length - 1],
};


// Find suitable tab to focus on based on settings.
export function findFallbackTab(activeTab, allTabs, excludedTabIds, settings) {
  const candidates = allTabs.filter(tab => {
    if (excludedTabIds.has(tab.id)) return false;
    if (settings.skipDiscarded && tab.discarded) return false;
    return isFallbackTab(tab.url, settings.fallbackUrls);
  });

  if (candidates.length === 0) return null;

  const strategy = JUMP_STRATEGIES[settings.jumpStrategy] || JUMP_STRATEGIES[DEFAULT_SETTINGS.jumpStrategy];
  return strategy(candidates, activeTab) || candidates[0];
}


// Move focus away from the current active tab if it is in targetTabs, otherwise return
export async function handleActiveTabFocus(targetTabs, settings) {
  const activeTab = targetTabs.find((t) => t.active);
  if (!activeTab) return;
  
  // Redirect only within the window
  const allTabs = await chrome.tabs.query({ windowId: activeTab.windowId });
  const excludedIds = new Set(targetTabs.map((t) => t.id));

  const nextTab = findFallbackTab(activeTab, allTabs, excludedIds, settings);

  if (nextTab) {
    await chrome.tabs.update(nextTab.id, { active: true });
  } else {
    // If no candidate tabs are available, create a fresh new tab to hold focus
    await chrome.tabs.create({ windowId: activeTab.windowId, active: true });
  }
}
