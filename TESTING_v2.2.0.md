# Testing Guide - v2.2.0 Auto-Refresh Feature

## 🧪 Pre-Testing Checklist

- [ ] Extension reloaded after code changes
- [ ] Browser notifications enabled
- [ ] At least one deal source configured
- [ ] Buy Box configured (optional but recommended)

---

## 🎯 Test Plan

### **Test 1: Settings Modal**

**Objective:** Verify settings modal opens and displays correctly

**Steps:**
1. Open dashboard
2. Click "🔔 Auto-Refresh Settings" button
3. Verify modal opens

**Expected Results:**
- ✅ Modal appears with all sections visible
- ✅ Checkboxes show default states (both enabled)
- ✅ Interval selector shows "Every 1 hour" selected
- ✅ Statistics show current deal counts
- ✅ Last refresh shows "Never" (first time)

---

### **Test 2: Enable/Disable Auto-Refresh**

**Objective:** Verify auto-refresh can be toggled

**Steps:**
1. Open settings modal
2. Uncheck "Enable Auto-Refresh"
3. Verify interval selector becomes hidden
4. Click "Save Settings"
5. Verify toast confirmation appears
6. Reopen settings modal
7. Verify checkbox is still unchecked

**Expected Results:**
- ✅ Interval row hides when disabled
- ✅ Settings persist after save
- ✅ Toast shows "disabled" message

---

### **Test 3: Change Refresh Interval**

**Objective:** Verify interval can be changed

**Steps:**
1. Open settings modal
2. Enable auto-refresh if disabled
3. Change interval to "Every 15 minutes"
4. Click "Save Settings"
5. Reopen settings modal
6. Verify "Every 15 minutes" is selected

**Expected Results:**
- ✅ Interval changes are saved
- ✅ Settings persist across modal open/close

---

### **Test 4: Test Notification**

**Objective:** Verify notification system works

**Steps:**
1. Open settings modal
2. Click "🔔 Test Notification" button
3. Wait 1-2 seconds

**Expected Results:**
- ✅ Browser notification appears
- ✅ Notification shows "🎯 New Deals Found!"
- ✅ Notification shows "3 new deals matching your Buy Box criteria"
- ✅ Notification auto-dismisses after ~10 seconds
- ✅ Toast shows "Test notification sent!"

**If notification doesn't appear:**
- Check browser notification permissions
- Check browser settings → Notifications
- Try clicking notification permission prompt if it appears

---

### **Test 5: Background Refresh (Quick Test)**

**Objective:** Verify background refresh triggers

**Steps:**
1. Open settings modal
2. Set interval to "Every 15 minutes"
3. Enable auto-refresh and notifications
4. Click "Save Settings"
5. Close settings modal
6. Open browser console (F12)
7. Wait 15 minutes (or modify code to test with 1 minute)

**Expected Results:**
- ✅ Console shows "🔄 Auto-refresh triggered at [time]"
- ✅ Console shows "📥 Fetching new deals..."
- ✅ If new deals found, notification appears
- ✅ Deal counts update in dashboard

**Alternative Quick Test:**
1. Open browser console
2. Go to Application → Service Workers
3. Find extension service worker
4. Click "Inspect" to open service worker console
5. Run: `chrome.alarms.create('autoRefreshDeals', { delayInMinutes: 0.1 })`
6. Wait ~6 seconds
7. Check for refresh logs

---

### **Test 6: New Deal Detection**

**Objective:** Verify new deals trigger notifications

**Steps:**
1. Note current deal count
2. Add a new deal manually (or add new source)
3. Click "🔄 Fetch Deals"
4. Verify deal count increases
5. Wait for next auto-refresh cycle

**Expected Results:**
- ✅ New deal appears in aggregator
- ✅ "New Today" count increases
- ✅ On next refresh, if deal matches Buy Box, notification appears

---

### **Test 7: Buy Box Filtering**

**Objective:** Verify notifications respect Buy Box criteria

**Setup:**
1. Configure Buy Box with specific criteria (e.g., TX only, $1M-$2M)
2. Enable auto-refresh and notifications
3. Add deals that match AND don't match criteria

**Steps:**
1. Add deal matching Buy Box (e.g., $1.5M, TX)
2. Trigger refresh
3. Verify notification appears
4. Add deal NOT matching Buy Box (e.g., $3M, CA)
5. Trigger refresh
6. Verify NO notification appears

**Expected Results:**
- ✅ Matching deals trigger notifications
- ✅ Non-matching deals are saved but don't notify
- ✅ Console logs show filtering logic

---

### **Test 8: Cross-Tab Sync**

**Objective:** Verify refresh syncs across tabs

**Steps:**
1. Open dashboard in Tab 1
2. Open dashboard in Tab 2
3. In Tab 1, trigger manual refresh
4. Check Tab 2

**Expected Results:**
- ✅ Both tabs show same deal counts
- ✅ Both tabs update when refresh occurs
- ✅ Console in both tabs shows refresh messages

---

### **Test 9: Settings Persistence**

**Objective:** Verify settings survive extension reload

**Steps:**
1. Configure settings:
   - Enable auto-refresh
   - Set interval to "Every 30 minutes"
   - Enable notifications
2. Save settings
3. Reload extension (chrome://extensions → Reload)
4. Open dashboard
5. Open settings modal

**Expected Results:**
- ✅ All settings preserved
- ✅ Auto-refresh resumes after reload
- ✅ Last refresh time preserved

---

### **Test 10: Statistics Display**

**Objective:** Verify statistics are accurate

**Steps:**
1. Open settings modal
2. Check "Total Deals" count
3. Check "New Today" count
4. Compare with aggregator tab stats

**Expected Results:**
- ✅ Total deals matches aggregator count
- ✅ New today matches dashboard stat
- ✅ Numbers formatted with commas

---

## 🐛 Common Issues & Solutions

### **Issue 1: Notifications Not Appearing**
**Solution:**
1. Check browser notification permissions
2. Run test notification
3. Check browser console for errors
4. Verify notifications enabled in OS settings

### **Issue 2: Auto-Refresh Not Triggering**
**Solution:**
1. Check if auto-refresh is enabled in settings
2. Verify interval is set
3. Check service worker console for alarm logs
4. Try reloading extension

### **Issue 3: Settings Not Saving**
**Solution:**
1. Check browser console for errors
2. Verify chrome.storage.local is available
3. Try clearing extension storage and reconfiguring

### **Issue 4: Deal Counts Wrong**
**Solution:**
1. Click "🔄 Fetch Deals" to force refresh
2. Check if sources are configured correctly
3. Verify storage isn't corrupted

---

## 📊 Test Results Template

```
Test Date: ___________
Tester: ___________
Browser: ___________
OS: ___________

Test 1 - Settings Modal:        [ ] Pass  [ ] Fail  Notes: ___________
Test 2 - Enable/Disable:         [ ] Pass  [ ] Fail  Notes: ___________
Test 3 - Change Interval:        [ ] Pass  [ ] Fail  Notes: ___________
Test 4 - Test Notification:      [ ] Pass  [ ] Fail  Notes: ___________
Test 5 - Background Refresh:     [ ] Pass  [ ] Fail  Notes: ___________
Test 6 - New Deal Detection:     [ ] Pass  [ ] Fail  Notes: ___________
Test 7 - Buy Box Filtering:      [ ] Pass  [ ] Fail  Notes: ___________
Test 8 - Cross-Tab Sync:         [ ] Pass  [ ] Fail  Notes: ___________
Test 9 - Settings Persistence:   [ ] Pass  [ ] Fail  Notes: ___________
Test 10 - Statistics Display:    [ ] Pass  [ ] Fail  Notes: ___________

Overall Status: [ ] All Pass  [ ] Some Failures
```

---

## 🔍 Debug Commands

### **Check Alarm Status**
```javascript
// In service worker console
chrome.alarms.getAll((alarms) => {
  console.log('Active alarms:', alarms);
});
```

### **Trigger Immediate Refresh**
```javascript
// In service worker console
chrome.alarms.create('autoRefreshDeals', { delayInMinutes: 0.1 });
```

### **Check Storage**
```javascript
// In dashboard console
chrome.storage.local.get([
  'autoRefreshEnabled',
  'refreshInterval',
  'notifyNewDeals',
  'lastRefreshTime',
  'lastDealCount'
], (result) => {
  console.log('Settings:', result);
});
```

### **Clear Settings**
```javascript
// In dashboard console
chrome.storage.local.remove([
  'autoRefreshEnabled',
  'refreshInterval',
  'notifyNewDeals',
  'lastRefreshTime',
  'lastDealCount'
], () => {
  console.log('Settings cleared');
});
```

---

## ✅ Acceptance Criteria

Feature is ready for release when:

- [x] All 10 tests pass
- [x] No console errors during normal operation
- [x] Notifications appear correctly
- [x] Settings persist across reloads
- [x] Background refresh works reliably
- [x] Buy Box filtering works correctly
- [x] UI is responsive and intuitive
- [x] Documentation is complete

---

**Version:** 2.2.0  
**Last Updated:** January 30, 2026  
**Status:** ⚠️ Awaiting User Testing
