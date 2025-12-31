// Background script to handle extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  // Send message to content script to toggle the window
  chrome.tabs.sendMessage(tab.id, { action: "toggleWindow" }, (response) => {
    // Check for errors (e.g., if content script isn't loaded on this page)
    if (chrome.runtime.lastError) {
      console.log('Content script not available on this page:', chrome.runtime.lastError.message);
      // Optionally, you could inject the content script here if needed
    }
  });
});

