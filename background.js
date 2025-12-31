// Background script to handle extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  // Send message to content script to toggle the window
  chrome.tabs.sendMessage(tab.id, { action: "toggleWindow" });
});

