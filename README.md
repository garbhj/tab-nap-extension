# The Plan

A while back, I noticed that all the existing extensions I've tried (e.g. The Great Suspender, Auto Tab Discard, Tab Suspender, The Great-er Tab Discarder, etc.) are all a bit sub-optimal. They tend to:
- Use a placeholder page rather than the native chrome.tabs.discard api, which may allow for easier customizability but leaves behind a 40-50 MB render process.
- Not offer a right-click tab-strip contextMenu addition for easy access and multi-tab selection (which is expected, since the "tab" option was only added to chrome.contextMenus with Chrome 150, less than 2 months ago as of writing this).
- Have kind of bad UI design (not that I have good UI design, but still).


My original idea had the additional goal of actually intelligently managing memory by looking at the memory footprints of different tabs, but I'm leaving that for later since the chrome.processes API is not available on the stable release.


Nonetheless, I'm deciding to make my own, starting from the basics. This one will require Chrome 150 or higher to work fully due to using the "tab" contextMenu.


To try it out, simply clone this repo, and go to chrome://extensions/, click Load unpacked at the top left, and select the directory containing manifest.json to add the extension to Chrome.


## Status

22/08/2026 - Basic feature, tab discard selection works.


## Other

If anyone has feedback, feel free to open an issue or something.