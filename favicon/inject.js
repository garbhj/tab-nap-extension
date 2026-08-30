// Function injected into the tab to update the DOM
export function injectFavicon(dataUrl) {
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

// Helper function, returns true if success, false if timeout 
// (note: doesn't actually do much and resolves in ~20 ms but chrome takes ~300 ms to update icons)
export function waitForFaviconUpdate(tabId, timeoutMs = 1000) {
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
