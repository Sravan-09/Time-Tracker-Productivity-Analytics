let activeDomain = null;
let startTime = null;

// Initialize state on service worker startup (e.g., browser open or extension reload)
chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
  if (tabs && tabs[0]) {
    updateActiveTab(tabs[0]);
  }
});

// Listener for when the user switches tabs
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    updateActiveTab(tab);
  });
});

// Listener for URL changes within the same tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.url) {
    updateActiveTab(tab);
  }
});

// Handle window focus (e.g., user minimizes browser or switches to another app)
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await recordTime(); // Stop the clock when browser loses focus
    activeDomain = null;
  } else {
    chrome.tabs.query({ active: true, windowId: windowId }, (tabs) => {
      if (tabs && tabs[0]) {
        updateActiveTab(tabs[0]);
      }
    });
  }
});

/**
 * Determines the current hostname and initiates a time recording for the previous domain
 */
async function updateActiveTab(tab) {
  await recordTime(); 
  
  if (chrome.runtime.lastError || !tab || !tab.url) {
    activeDomain = null;
    return;
  }
  
  try {
    let url = new URL(tab.url);
    if (url.protocol.startsWith("http")) {
      activeDomain = url.hostname;
      startTime = Date.now();
    } else {
      activeDomain = null;
    }
  } catch (e) {
    activeDomain = null;
  }
}

/**
 * Calculates elapsed time and saves it to chrome.storage.local
 */
async function recordTime() {
  if (activeDomain && startTime) {
    let timeSpent = Math.floor((Date.now() - startTime) / 1000);
    let domainToLog = activeDomain;
    
    if (timeSpent > 0) {
      let result = await chrome.storage.local.get([domainToLog]);
      let currentTotal = result[domainToLog] || 0;
      await chrome.storage.local.set({ [domainToLog]: currentTotal + timeSpent });
    }
  }
  startTime = Date.now(); // Reset start time for the next interval
}

// Periodic sync every 5 minutes
chrome.alarms.create("syncData", { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "syncData") {
    syncWithBackend();
  }
});

// Listen for manual sync requests from the popup UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "forceSync") {
    syncWithBackend().then(() => {
      sendResponse({ success: true });
    });
    return true; // Keep channel open for async response
  }
});

/**
 * Aggregates local storage and pushes it to the remote server
 */
async function syncWithBackend() {
  await recordTime(); // Finalize current active session before syncing
  
  let items = await chrome.storage.local.get(null);
  
  if (Object.keys(items).length === 0) return;
  
  try {
    await fetch("http://localhost:3000/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user123", data: items })
    });
    
    // Clear local cache only after successful server confirmation
    await chrome.storage.local.clear();
    startTime = Date.now(); 
  } catch (err) {
    console.error("Sync failed:", err);
  }
}