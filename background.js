// Background script to handle extension icon clicks and auto-refresh
console.log('🔧 Background service worker starting...');

// ====== AUTO-REFRESH SCHEDULER ======
const ALARM_NAME = 'autoRefreshDeals';
const DEFAULT_REFRESH_INTERVAL = 60; // minutes

// Initialize auto-refresh on install/update
chrome.runtime.onInstalled.addListener(async () => {
  console.log('📦 Extension installed/updated');
  
  // Load user preferences
  const { autoRefreshEnabled, refreshInterval } = await chrome.storage.local.get([
    'autoRefreshEnabled',
    'refreshInterval'
  ]);
  
  // Set defaults if not configured
  if (autoRefreshEnabled === undefined) {
    await chrome.storage.local.set({ 
      autoRefreshEnabled: true,
      refreshInterval: DEFAULT_REFRESH_INTERVAL,
      notifyNewDeals: true,
      lastRefreshTime: null,
      lastDealCount: 0
    });
  }
  
  // Schedule alarm if enabled
  if (autoRefreshEnabled !== false) {
    scheduleAutoRefresh(refreshInterval || DEFAULT_REFRESH_INTERVAL);
  }
});

// Schedule the auto-refresh alarm
function scheduleAutoRefresh(intervalMinutes) {
  chrome.alarms.clear(ALARM_NAME, () => {
    chrome.alarms.create(ALARM_NAME, {
      periodInMinutes: intervalMinutes
    });
    console.log(`⏰ Auto-refresh scheduled every ${intervalMinutes} minutes`);
  });
}

// Handle alarm trigger
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('🔄 Auto-refresh triggered at', new Date().toLocaleTimeString());
    await refreshDealsInBackground();
  }
});

// Refresh deals in background
async function refreshDealsInBackground() {
  try {
    console.log('📥 Fetching new deals...');
    
    // Get current settings
    const { 
      aggregatedDealsPool, 
      buyBoxSettings,
      lastDealCount,
      notifyNewDeals 
    } = await chrome.storage.local.get([
      'aggregatedDealsPool',
      'buyBoxSettings',
      'lastDealCount',
      'notifyNewDeals'
    ]);
    
    const previousDeals = aggregatedDealsPool || [];
    const previousCount = lastDealCount || previousDeals.length;
    
    // Send message to any open dashboard tabs to refresh
    const tabs = await chrome.tabs.query({});
    let refreshed = false;
    
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { 
          action: 'backgroundRefresh',
          timestamp: Date.now()
        });
        refreshed = true;
        console.log('✅ Sent refresh signal to tab:', tab.id);
      } catch (err) {
        // Tab doesn't have our content script, skip
      }
    }
    
    // Wait a bit for refresh to complete
    if (refreshed) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check for new deals
      const { aggregatedDealsPool: updatedDeals } = await chrome.storage.local.get('aggregatedDealsPool');
      const newDeals = (updatedDeals || []).filter(deal => {
        const isNew = deal.discoveredAt > (Date.now() - 24 * 60 * 60 * 1000);
        return isNew && !previousDeals.some(pd => pd.id === deal.id);
      });
      
      // Filter by Buy Box if configured
      let matchingNewDeals = newDeals;
      if (buyBoxSettings && newDeals.length > 0) {
        matchingNewDeals = newDeals.filter(deal => dealMatchesBuyBox(deal, buyBoxSettings));
      }
      
      // Update last refresh time and count
      await chrome.storage.local.set({
        lastRefreshTime: Date.now(),
        lastDealCount: (updatedDeals || []).length
      });
      
      // Notify if new matching deals found
      if (notifyNewDeals && matchingNewDeals.length > 0) {
        showNewDealsNotification(matchingNewDeals.length);
      }
      
      console.log(`✅ Refresh complete: ${matchingNewDeals.length} new matching deals`);
    }
    
  } catch (error) {
    console.error('❌ Background refresh failed:', error);
  }
}

// Check if deal matches Buy Box criteria
function dealMatchesBuyBox(deal, buyBox) {
  if (!buyBox) return true;
  
  // Price filter
  if (buyBox.minPrice && deal.askingPrice < buyBox.minPrice) return false;
  if (buyBox.maxPrice && deal.askingPrice > buyBox.maxPrice) return false;
  
  // EBITDA filter
  if (buyBox.minEbitda && deal.ebitda < buyBox.minEbitda) return false;
  if (buyBox.maxEbitda && deal.ebitda > buyBox.maxEbitda) return false;
  
  // Revenue filter
  if (buyBox.minRevenue && deal.revenue < buyBox.minRevenue) return false;
  if (buyBox.maxRevenue && deal.revenue > buyBox.maxRevenue) return false;
  
  // Location filter (target states)
  if (buyBox.targetStates && buyBox.targetStates.length > 0) {
    const dealState = (deal.state || '').toUpperCase().trim();
    const hasTargetState = buyBox.targetStates.some(s => 
      s.toUpperCase().trim() === dealState
    );
    if (!hasTargetState) return false;
  }
  
  // Exclude states
  if (buyBox.excludeStates && buyBox.excludeStates.length > 0) {
    const dealState = (deal.state || '').toUpperCase().trim();
    const isExcluded = buyBox.excludeStates.some(s => 
      s.toUpperCase().trim() === dealState
    );
    if (isExcluded) return false;
  }
  
  // Industry filter
  if (buyBox.targetIndustries && buyBox.targetIndustries.length > 0) {
    const dealIndustry = (deal.industry || '').toLowerCase();
    const hasTargetIndustry = buyBox.targetIndustries.some(ind => 
      dealIndustry.includes(ind.toLowerCase())
    );
    if (!hasTargetIndustry) return false;
  }
  
  return true;
}

// Show notification for new deals
function showNewDealsNotification(count) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: '🎯 New Deals Found!',
    message: `${count} new deal${count > 1 ? 's' : ''} matching your Buy Box criteria`,
    priority: 2,
    requireInteraction: false
  }, (notificationId) => {
    console.log('📬 Notification shown:', notificationId);
    
    // Auto-clear after 10 seconds
    setTimeout(() => {
      chrome.notifications.clear(notificationId);
    }, 10000);
  });
}

// Handle notification clicks - open dashboard
chrome.notifications.onClicked.addListener((notificationId) => {
  console.log('🖱️ Notification clicked:', notificationId);
  // Could open dashboard in new tab or focus existing tab
});

// Handle messages from dashboard
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'testNotification') {
    console.log('🧪 Test notification requested');
    showNewDealsNotification(3); // Show test with 3 deals
    sendResponse({ success: true });
  }
  return true; // Keep channel open for async response
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.autoRefreshEnabled || changes.refreshInterval) {
      const enabled = changes.autoRefreshEnabled?.newValue ?? true;
      const interval = changes.refreshInterval?.newValue ?? DEFAULT_REFRESH_INTERVAL;
      
      if (enabled) {
        scheduleAutoRefresh(interval);
      } else {
        chrome.alarms.clear(ALARM_NAME);
        console.log('⏸️ Auto-refresh disabled');
      }
    }
  }
});

// ====== EXTENSION ICON CLICK ======
chrome.action.onClicked.addListener(async (tab) => {
  console.log('🖱️ Extension icon clicked on tab:', tab.id);
  
  // Try to send message to content script to toggle the popup overlay
  try {
    await chrome.tabs.sendMessage(tab.id, { action: "toggleWindow" });
    console.log('✅ Toggle message sent to content script');
  } catch (error) {
    // Content script not available (chrome:// pages, new tab, PDF, etc.)
    console.log('⚠️ Content script not available, opening dashboard in new tab');
    console.log('   Reason:', error.message);
    
    // Check if dashboard is already open in any tab
    const tabs = await chrome.tabs.query({});
    const dashboardTab = tabs.find(t => t.url && t.url.includes('deals-dashboard.html'));
    
    if (dashboardTab) {
      // Focus existing dashboard tab
      console.log('✅ Dashboard already open, focusing tab:', dashboardTab.id);
      await chrome.tabs.update(dashboardTab.id, { active: true });
      await chrome.windows.update(dashboardTab.windowId, { focused: true });
    } else {
      // Open dashboard in new tab
      console.log('🚀 Opening dashboard in new tab');
      const dashboardUrl = chrome.runtime.getURL('deals-dashboard.html');
      await chrome.tabs.create({ url: dashboardUrl });
    }
  }
});

