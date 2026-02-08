# Quick Test Guide - v3.0.18

## How to Test the Fix

### Setup
1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Reload" on the Max Price Deal Analyzer extension
4. Verify version shows **3.0.18**

### Test 1: Basic Auto-fill on Fresh Load ✅
**Steps:**
1. Navigate to: https://www.bizquest.com/businesses-for-sale/
2. Click on any business listing (e.g., "Light Industrial Staffing")
3. Click the extension icon to open the analyzer
4. Scroll to bottom and find the "Deal name (for saving)" field

**Expected Result:**
- ✅ Field should be automatically filled with business name
- Console should show: `🔄 URL changed - cleared Deal Name field for auto-fill`
- Console should show: `✅ Auto-filled Deal Name: [business name]`

---

### Test 2: Navigate to Different Listing ✅
**Steps:**
1. With extension open on first listing
2. Click a different business listing
3. Wait 1 second for auto-refresh
4. Check the Deal Name field

**Expected Result:**
- ✅ Field updates to new listing name automatically
- Console shows URL change message
- Console shows auto-fill success message

---

### Test 3: Page Refresh ✅
**Steps:**
1. Open extension on any listing
2. Verify Deal Name is auto-filled
3. Press F5 to refresh the page
4. Click extension icon again
5. Check Deal Name field

**Expected Result:**
- ✅ Field is auto-filled again with same business name

---

### Test 4: User Edit Protection ✅
**Steps:**
1. Auto-fill works initially
2. Change the Deal Name to "My Custom Name"
3. Change EBITDA or other fields (triggers recalculation)
4. Check Deal Name field

**Expected Result:**
- ✅ "My Custom Name" remains unchanged

---

## Console Checks

Open Developer Tools (F12) → Console tab

**Look for these messages:**

✅ **On URL change:**
```
🔄 URL changed - cleared Deal Name field for auto-fill
```

✅ **On successful auto-fill:**
```
✅ Auto-filled Deal Name: Light Industrial Staffing & Workforce Solutions Firm
```

✅ **In scraping summary:**
```
📋 SCRAPING SUMMARY:
   Platform: bizquest
   Asking Price: $4,500,000
   EBITDA/SDE: $1,100,000 (EBITDA)
```

---

## Troubleshooting

**If auto-fill still doesn't work:**

1. **Clear extension storage:**
   - Open Chrome DevTools on the page
   - Console → Type: `chrome.storage.local.clear()`
   - Press Enter
   - Refresh page

2. **Hard reload extension:**
   - Go to `chrome://extensions`
   - Find "Max Price Deal Analyzer"
   - Click "Remove"
   - Click "Load unpacked" and select the extension folder again

3. **Check for errors:**
   - Open Console (F12)
   - Look for any red error messages
   - Check if `getBusinessName()` returns a valid name:
     - Type in console: `getBusinessName()`
     - Should return the business name, not "Deal-Analysis"

---

## What Changed in v3.0.18

### Problem
- Auto-fill wasn't working on page load or new listings
- Field retained old values when navigating

### Fix
1. **State Management**: Don't clear Deal Name field if no saved state
2. **URL Detection**: Clear Deal Name when URL changes to new listing
3. **Timing**: Auto-fill happens after clearing, ensuring fresh data

---

## Verification Checklist

Test each scenario and mark completed:

- [ ] Auto-fills on BizQuest listing
- [ ] Auto-fills on BizBuySell listing
- [ ] Updates when navigating to new listing
- [ ] Works after page refresh
- [ ] Doesn't overwrite user edits
- [ ] Console shows correct debug messages
- [ ] Version displays as v3.0.18
- [ ] Save/Load deal preserves custom names

---

## Expected Behavior Summary

| Action | Deal Name Field Behavior |
|--------|-------------------------|
| Open extension on new listing | ✅ Auto-fills with listing title |
| Navigate to different listing | ✅ Clears and auto-fills new title |
| Refresh page | ✅ Auto-fills again |
| User edits name | ✅ Preserved, no auto-fill |
| Save deal | ✅ Saves custom or auto-filled name |
| Load deal | ✅ Restores saved name |

---

## Success Criteria

All tests pass ✅ → Feature is working correctly!

If any test fails, check console for error messages and report them.
