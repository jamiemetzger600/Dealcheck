# Auto-Refresh & Notifications Guide - v2.2.0

## 🎯 Overview

The Auto-Refresh feature automatically checks your deal sources for new listings in the background, even when the extension is closed. When new deals matching your Buy Box criteria are found, you'll receive instant notifications.

---

## ✨ Features

### 1. **Scheduled Auto-Refresh**
- Automatically fetches new deals from all your sources
- Runs in the background (no need to keep dashboard open)
- Configurable intervals: 15 minutes to once per day
- Minimal battery/resource impact

### 2. **Smart Notifications**
- Get notified only for deals matching your Buy Box
- Shows count of new matching deals
- Click notification to open dashboard (future enhancement)
- Auto-dismisses after 10 seconds

### 3. **Background Sync**
- Syncs across all open tabs
- Updates deal counts automatically
- Tracks last refresh time
- Monitors new deals added today

---

## 🚀 How to Use

### **Step 1: Open Settings**
1. Click the **"🔔 Auto-Refresh Settings"** button in the top toolbar
2. The settings modal will open

### **Step 2: Enable Auto-Refresh**
1. Check **"Enable Auto-Refresh"** checkbox
2. Select your preferred refresh interval:
   - **Every 15 minutes** - For active deal hunting
   - **Every 30 minutes** - Balanced approach
   - **Every 1 hour** (default) - Recommended for most users
   - **Every 2-8 hours** - For passive monitoring
   - **Once per day** - Minimal updates

### **Step 3: Configure Notifications**
1. Check **"Show notifications for new matching deals"**
2. Make sure your Buy Box is configured (see below)
3. Click **"🔔 Test Notification"** to verify it works

### **Step 4: Save Settings**
1. Click **"💾 Save Settings"**
2. You'll see a confirmation message
3. Auto-refresh will start immediately

---

## 📋 How It Works

### **Background Process**
```
Every [interval] minutes:
  1. Background service worker wakes up
  2. Sends refresh signal to any open dashboard tabs
  3. Dashboard fetches new deals from all sources
  4. Compares with previous deal list
  5. Filters new deals by Buy Box criteria
  6. Shows notification if matching deals found
  7. Updates storage with new deals
  8. Goes back to sleep
```

### **Notification Logic**
```
New Deal Found → Is it less than 24 hours old? 
  ↓ YES
  → Does it match Buy Box criteria?
    ↓ YES
    → Show notification ✅
    ↓ NO
    → Skip notification (silent update)
```

---

## ⚙️ Buy Box Integration

**IMPORTANT:** Notifications only show for deals matching your Buy Box criteria.

### **Configure Your Buy Box First:**
1. Click **"⚙️ Configure Buy Box"** button
2. Set your criteria:
   - **Price Range** - Min/max asking price
   - **EBITDA Range** - Min/max EBITDA
   - **Revenue Range** - Min/max revenue
   - **Target States** - States you want to invest in
   - **Exclude States** - States to avoid
   - **Target Industries** - Industries of interest
3. Save your Buy Box

### **Example Notification Scenarios:**

**Scenario 1: Strict Buy Box**
- Buy Box: $500K-$2M price, TX/FL only, Healthcare
- New Deal: $1.5M, Healthcare, Dallas, TX
- **Result:** ✅ Notification shown

**Scenario 2: Deal Outside Criteria**
- Buy Box: $500K-$2M price, TX/FL only
- New Deal: $3M, Healthcare, Dallas, TX (price too high)
- **Result:** ❌ No notification (deal still saved, just not notified)

**Scenario 3: No Buy Box**
- Buy Box: Not configured
- New Deal: Any deal
- **Result:** ✅ Notification shown for ALL new deals

---

## 📊 Settings Modal Features

### **Auto-Refresh Settings Section**
- **Enable/Disable Toggle** - Turn auto-refresh on/off
- **Interval Selector** - Choose refresh frequency
- **Last Refresh Time** - See when deals were last updated
- **Next Refresh Time** - See when next update will occur

### **Notifications Section**
- **Enable/Disable Toggle** - Turn notifications on/off
- **Test Button** - Send test notification
- **Tip Box** - Reminder about Buy Box configuration

### **Statistics Section**
- **Total Deals** - Current deal count in aggregator
- **New Today** - Deals added in last 24 hours

---

## 🔧 Technical Details

### **Permissions Required**
```json
"permissions": [
  "alarms",        // For scheduled background tasks
  "notifications"  // For desktop notifications
]
```

### **Storage Keys**
- `autoRefreshEnabled` - Boolean (default: true)
- `refreshInterval` - Number in minutes (default: 60)
- `notifyNewDeals` - Boolean (default: true)
- `lastRefreshTime` - Timestamp of last refresh
- `lastDealCount` - Deal count from last refresh

### **Background Service Worker**
- Uses Chrome Alarms API for scheduling
- Wakes up only when needed (battery efficient)
- Persists across browser restarts
- Automatically resumes after extension updates

---

## 💡 Best Practices

### **For Active Deal Hunters:**
- Set refresh interval to **15-30 minutes**
- Enable notifications
- Configure specific Buy Box criteria
- Check dashboard daily

### **For Passive Investors:**
- Set refresh interval to **4-8 hours**
- Enable notifications
- Configure broad Buy Box criteria
- Review weekly

### **For Deal Aggregators:**
- Set refresh interval to **1 hour**
- Enable notifications
- Use multiple custom sources
- Monitor statistics regularly

---

## 🐛 Troubleshooting

### **Not Receiving Notifications?**
1. **Check browser permissions:**
   - Go to browser settings → Notifications
   - Ensure notifications are allowed for Chrome/your browser
   - Ensure extension notifications are enabled

2. **Check extension settings:**
   - Open Auto-Refresh Settings
   - Verify "Show notifications" is checked
   - Click "Test Notification" button

3. **Check Buy Box:**
   - If Buy Box is very restrictive, you may not get notifications
   - Temporarily disable Buy Box filters to test

### **Auto-Refresh Not Working?**
1. **Verify it's enabled:**
   - Open settings modal
   - Check "Enable Auto-Refresh" is checked
   - Check "Last Refresh Time" is updating

2. **Check browser:**
   - Chrome must be running (can be in background)
   - Extension must not be disabled
   - Check browser console for errors

3. **Manual refresh:**
   - Click "🔄 Fetch Deals" button
   - Check if new deals appear

### **Notifications Too Frequent?**
1. **Increase refresh interval** (e.g., from 15 min to 1 hour)
2. **Refine Buy Box criteria** (make it more specific)
3. **Disable notifications** but keep auto-refresh enabled

---

## 🎯 Use Cases

### **Use Case 1: Daily Deal Hunter**
**Profile:** Active investor looking for deals daily
**Setup:**
- Refresh: Every 30 minutes
- Notifications: Enabled
- Buy Box: Specific criteria (e.g., $1M-$3M, Healthcare, TX)
**Result:** Get notified immediately when matching deals appear

### **Use Case 2: Weekend Reviewer**
**Profile:** Part-time investor who reviews deals on weekends
**Setup:**
- Refresh: Every 4 hours
- Notifications: Disabled
- Buy Box: Broad criteria
**Result:** Fresh deals waiting every weekend, no interruptions during week

### **Use Case 3: Market Researcher**
**Profile:** Tracking market trends and deal flow
**Setup:**
- Refresh: Every 1 hour
- Notifications: Enabled
- Buy Box: Multiple industries, all states
**Result:** Comprehensive market data, notified of significant new listings

---

## 📈 Future Enhancements

### **Planned Features:**
- [ ] Click notification to open specific deal
- [ ] Notification grouping (e.g., "5 new deals in last hour")
- [ ] Custom notification sounds
- [ ] Email notifications (in addition to desktop)
- [ ] SMS notifications via Twilio integration
- [ ] Slack/Discord webhook integration
- [ ] Smart notification timing (quiet hours)
- [ ] Notification history log
- [ ] Per-source refresh intervals
- [ ] Conditional notifications (e.g., only if EBITDA > $500K)

---

## 🔒 Privacy & Security

- All data stored locally in browser
- No external servers involved
- Notifications contain only deal count (no sensitive data)
- Background process runs only when needed
- No tracking or analytics

---

## 📞 Support

If you encounter issues:
1. Check browser console for error messages
2. Try disabling/re-enabling auto-refresh
3. Reload extension
4. Check that sources are configured correctly

---

**Version:** 2.2.0  
**Last Updated:** January 2026  
**Feature Status:** ✅ Production Ready
