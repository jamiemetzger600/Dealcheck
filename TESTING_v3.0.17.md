# Testing Guide - v3.0.17: Auto-fill Deal Name

## Feature Overview
The extension now automatically fills the "Deal Name" field with the parsed business name from the listing page.

## Test Scenarios

### Test 1: Basic Auto-fill on BizQuest
**Steps:**
1. Navigate to: https://www.bizquest.com/businesses-for-sale/listing/
2. Open any business listing (e.g., the "Light Industrial Staffing" example from the image)
3. Click the extension icon to open the Deal Analyzer
4. Scroll down to the bottom section
5. Locate the "Deal name (for saving)" input field

**Expected Result:**
✅ The field should be automatically populated with the business name from the page (e.g., "Light Industrial Staffing & Workforce Solutions Firm")

**Console Log:**
You should see: `✅ Auto-filled Deal Name: [business name]`

---

### Test 2: Auto-fill on BizBuySell
**Steps:**
1. Navigate to: https://www.bizbuysell.com/
2. Open any business listing
3. Activate the extension
4. Check the Deal Name field

**Expected Result:**
✅ Field should contain the business name (cleaned of " | BizBuySell" suffix)

---

### Test 3: Empty Field Behavior
**Steps:**
1. Open any business listing
2. Activate the extension (field auto-fills)
3. Clear the Deal Name field manually
4. Close and reopen the extension on the same page

**Expected Result:**
✅ Field remains empty (doesn't auto-fill again on same page)

---

### Test 4: User Edit Protection
**Steps:**
1. Open any business listing
2. Activate the extension (field auto-fills)
3. Edit the Deal Name field to something custom
4. Change other fields (EBITDA, Asking Price)
5. Check the Deal Name field

**Expected Result:**
✅ Your custom name remains unchanged (not overwritten by auto-fill)

---

### Test 5: Generic Site Fallback
**Steps:**
1. Open the local test file: `file:///path/to/test.html`
2. Activate the extension
3. Check the Deal Name field

**Expected Result:**
✅ Should use the h1 heading: "Test Business Listing - Pizza Restaurant"

---

### Test 6: No Name Available
**Steps:**
1. Navigate to a generic webpage (e.g., google.com)
2. Activate the extension
3. Check the Deal Name field

**Expected Result:**
✅ Field remains empty (fallback "Deal-Analysis" is not used)

---

## Debugging

### Console Logs to Check
Open Developer Tools (F12) → Console tab

**Successful auto-fill:**
```
✅ Auto-filled Deal Name: Light Industrial Staffing & Workforce Solutions Firm
```

**Scraping summary:**
```
📋 SCRAPING SUMMARY:
   Platform: bizquest
   Asking Price: $4,500,000
   EBITDA/SDE: $1,100,000 (EBITDA)
```

**Business name extraction:**
```
Page title: Light Industrial Staffing & Workforce Solutions Firm - BizQuest
Cleaned title: Light Industrial Staffing & Workforce Solutions Firm
```

### Common Issues

**Issue:** Deal Name field is empty
- Check console for "Page title:", "Cleaned title:", "Found h1:" logs
- Verify the page has a proper title or h1 heading
- Check if the page is dynamically loaded (may need to wait for content)

**Issue:** Deal Name shows "Deal-Analysis"
- This is the fallback and shouldn't appear in the field
- The code filters out this fallback: `businessName !== 'Deal-Analysis'`

**Issue:** Deal Name gets overwritten on field changes
- This should NOT happen - auto-fill only occurs in `scrapeData()`
- Check if there are errors in console
- Verify the condition: `!dealNameField.value.trim()`

---

## Manual Testing Checklist

- [ ] Auto-fills on BizQuest listing
- [ ] Auto-fills on BizBuySell listing  
- [ ] Auto-fills on Crexi listing
- [ ] Cleans up platform suffixes (BizQuest, BizBuySell, etc.)
- [ ] Doesn't overwrite existing user input
- [ ] Doesn't fill on second scrape if already populated
- [ ] Falls back to h1 heading if page title is generic
- [ ] Doesn't fill with "Deal-Analysis" fallback
- [ ] Console logs show successful extraction
- [ ] Works with save/load deal functionality

---

## Integration Testing

### Test with Save Deal Feature
1. Open a business listing
2. Verify Deal Name auto-fills
3. Click "Save Deal" button (💾 icon)
4. Open Deals Dashboard
5. Verify the deal is saved with the correct name

**Expected Result:**
✅ Deal appears in dashboard with the auto-filled name

### Test with Load Deal Feature
1. Save a deal with auto-filled name
2. Clear all fields
3. Load the saved deal
4. Check the Deal Name field

**Expected Result:**
✅ Deal Name is restored from saved data (not auto-filled from page)

---

## Performance

The auto-fill happens during the existing scraping process, adding minimal overhead:
- Uses the existing `getBusinessName()` function
- Only runs if field is empty
- Single DOM query and value assignment
- No network requests or heavy processing

---

## Version Check

Verify the extension version shows **v3.0.17** in:
1. Extension header in the UI
2. Chrome extensions page (chrome://extensions)
3. Console log on extension load: `📦 Deal Analyzer Version: 3.0.17`
