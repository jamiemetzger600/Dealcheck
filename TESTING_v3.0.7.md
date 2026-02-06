# Testing Guide - Version 3.0.7

## Quick Test Checklist

### ✅ Test 1: All Columns Visible in UI

1. Reload extension (chrome://extensions → Reload)
2. Open Deals Dashboard
3. Click **"Columns"** button
4. **Expected**: You should see ALL 17 columns from your Google Sheet:

```
☑ Name (always on)
☑ Date Added
☑ Industry
☐ Description
☐ City
☐ County
☐ State
☐ Country
☐ Years Established
☑ Annual Profit
☐ Annual Revenue
☑ Asking Price
☐ Profit Multiple
☐ Revenue Multiple
☐ Remote/Relocatable/Absentee-Run  ← KEY COLUMN
☐ Franchise
☐ 5+ Years In Business
☐ Broker Name
☐ Broker Company
☐ Broker Contact
☐ Broker Email
☑ Location
☑ Source
☐ Listing URL
```

**✅ PASS**: All 24 columns appear  
**❌ FAIL**: Some columns missing → check console for errors

---

### ✅ Test 2: Enable Custom Columns

1. In column visibility panel, check these boxes:
   - ☑ Remote/Relocatable/Absentee-Run
   - ☑ Franchise
   - ☑ 5+ Years In Business
   - ☑ Profit Multiple
   
2. **Expected**: Table headers update to show these columns
3. **Expected**: Deal rows show data for these columns

**✅ PASS**: Columns appear with data  
**❌ FAIL**: Columns appear but show "-" → data not being imported

---

### ✅ Test 3: Name Column Wrapping

1. Find the NAME column header
2. Hover on the right edge until you see resize cursor
3. Drag to make column wider (e.g., 500px wide)
4. **Expected**: Long deal names wrap to multiple lines (no ellipsis)

**✅ PASS**: Text wraps naturally  
**❌ FAIL**: Text still truncated with "..." → CSS not applied

---

### ✅ Test 4: Hide Deals Feature

1. Find any deal in the table
2. Click the **👁️‍🗨️** button (left of deal name)
3. **Expected**: Deal immediately disappears from table
4. **Expected**: Toast message: "Deal hidden: [Deal Name]"
5. Look at **"Show Hidden (X)"** label
6. **Expected**: Count increases (e.g., "Show Hidden (1)")

**✅ PASS**: Deal hides, count updates  
**❌ FAIL**: Deal doesn't hide → check console for errors

---

### ✅ Test 5: Show Hidden Deals

1. Check the **"Show Hidden (X)"** checkbox
2. **Expected**: Previously hidden deals reappear in table
3. **Expected**: Console shows "Showing hidden deals (toggle ON)"

4. Uncheck the toggle
5. **Expected**: Hidden deals disappear again

**✅ PASS**: Toggle works both ways  
**❌ FAIL**: Deals don't reappear → check hidden IDs in storage

---

### ✅ Test 6: Hidden Deals Persist

1. Hide 2-3 deals
2. Close the dashboard completely
3. Reopen the dashboard
4. **Expected**: Those deals are still hidden
5. **Expected**: "Show Hidden (X)" shows correct count

**✅ PASS**: Hidden deals persist across sessions  
**❌ FAIL**: Deals reappear → storage not saving

---

### ✅ Test 7: Fetch Buttons Alignment

**Test Header "Fetch Deals" Button:**
1. Click **"🔄 Fetch Deals"** in header
2. **Expected Console**:
   ```
   🔄 Fetching deals from Google Sheets only...
   📥 Fetched XXX deals from Google Sheets
   📊 Added XX new deals, XX duplicates, total: XXXX
   ```
3. **Expected Toast**: "✅ Added XX new deals. Total: XXXX deals (max 6000)"
4. **Expected**: Table refreshes, hidden count updates

**Test Individual Source Fetch:**
1. Click **"📥 Manage Sources"**
2. Find your Google Sheet source
3. Click **"🔄 Fetch"** next to it
4. **Expected Console**:
   ```
   ✅ Fetched XXX deals from [Source Name]
   📊 Added XX new deals, XX duplicates, total: XXXX
   ```
5. **Expected Toast**: "✅ Added XX new deals from [Source Name]"

**✅ PASS**: Both buttons work identically with consistent feedback  
**❌ FAIL**: Different behavior → document exact difference

---

### ✅ Test 8: Buy Box Custom Column Filter

**Setup:**
1. Open browser console (F12)
2. Run this command:
```javascript
currentBuyBox.customFilters = {
  "Remote/Relocatable/Absentee-Run": "Yes"
};
await saveBuyBoxSettings();
applyAggregatorFilters();
```

**Expected:**
- Only deals with "Yes" in the Absentee-Run column should show
- Console should show filter being applied
- Deal count decreases

**✅ PASS**: Filter works correctly  
**❌ FAIL**: All deals still show → check rawColumns data

---

## Console Commands for Debugging

### Check if rawColumns is populated:
```javascript
const deals = await loadAggregatedDeals();
console.log('First deal rawColumns:', deals[0]?.rawColumns);
console.log('Available columns:', Object.keys(deals[0]?.rawColumns || {}));
```

### Check hidden deals:
```javascript
const hiddenIds = await getHiddenDealIds();
console.log('Hidden deal IDs:', Array.from(hiddenIds));
console.log('Hidden count:', hiddenIds.size);
```

### Check column config:
```javascript
console.log('COLUMN_CONFIG:', Object.keys(COLUMN_CONFIG));
console.log('Available columns:', availableColumns);
```

### Clear hidden deals:
```javascript
await clearHiddenDeals();
console.log('All hidden deals cleared');
applyAggregatorFilters();
```

### Reset column visibility to defaults:
```javascript
await chrome.storage.local.remove(['visibleColumns']);
location.reload();
```

---

## Expected Console Output

On page load with data:
```
📦 Deal Analyzer Version: 3.0.7
📊 Loaded XXXX aggregated deals
📊 Deals by source type: {google_sheets: XXXX}
🔍 Sample deal 1: {...}
📋 Detected X additional columns from rawColumns: [...]
📊 Total available columns: 24 [name, date, industry, ...]
```

When clicking "Columns" button:
```
📋 Detected X additional columns from rawColumns: [...]
📊 Total available columns: 24
```

When hiding a deal:
```
💾 Saved X hidden deal IDs
👁️‍🗨️ Hidden deal: custom_abc123
```

When filtering:
```
🔍 Starting filter with XXXX deals
👁️‍🗨️ Hidden deals filter: XXXX → XXXX deals (removed X hidden)
📦 Buy Box filter: XXXX → XXXX deals (removed X)
```

---

## Troubleshooting

### Columns show "(no data)"

**Cause**: Deal objects don't have that field populated

**Fix**: Check if Google Sheets columns are being parsed:
```javascript
const deals = await loadAggregatedDeals();
console.log('Sample deal:', deals[0]);
```

Look for the field name (e.g., `remote`, `franchise`). If it's null or empty, the parser isn't extracting it.

### "Remote/Relocatable/Absentee-Run" not appearing

**Cause**: Field name might be slightly different in your sheet

**Fix**: Check actual column names:
```javascript
const deals = await loadAggregatedDeals();
console.log('rawColumns:', deals[0]?.rawColumns);
```

Look for the exact column name, then use that in custom filters.

### Hidden deals not working

**Cause**: Functions not loaded

**Fix**: Check if functions are available:
```javascript
console.log('hideDeal:', typeof hideDeal);
console.log('getHiddenDealIds:', typeof getHiddenDealIds);
```

If undefined, storage-manager.js didn't load properly.

### Columns disabled/grayed out

This is normal for:
- Columns with no data (marked "no data")
- "Name" column (required, always visible)

---

## Feature Highlights

### 1. Complete Data Access
- ✅ All 17 columns from Google Sheets A:Q
- ✅ Additional broker/location fields
- ✅ User chooses what to show/hide
- ✅ All data preserved in storage

### 2. Fast Deal Hiding
- ✅ One-click hide button (👁️‍🗨️)
- ✅ Non-destructive (can unhide anytime)
- ✅ Persists across sessions
- ✅ Fast filtering (just IDs stored)

### 3. Name Column Flexibility
- ✅ Expands to show full text
- ✅ Wraps naturally (no truncation)
- ✅ Adjustable width via drag

### 4. Custom Column Filters
- ✅ Filter on ANY column from sheet
- ✅ Example: Show only "Absentee-Run" deals
- ✅ Supports string and boolean matching

---

## What User Sees

### Column Visibility Panel (24 columns):
```
☑ Name (required)
☑ Date Added
☑ Industry  
☐ Description
☐ City
☐ County
☐ State
☐ Country
☐ Years Established
☑ Annual Profit
☐ Annual Revenue
☑ Asking Price
☐ Profit Multiple
☐ Revenue Multiple
☐ Remote/Relocatable/Absentee-Run ← KEY!
☐ Franchise
☐ 5+ Years In Business
☐ Broker Name
☐ Broker Company
☐ Broker Contact
☐ Broker Email
☑ Location
☑ Source
☐ Listing URL
```

### Filter Controls:
```
[Search box]  [Columns]  [☐ Show Hidden (0)]  [Clear & Refresh]
```

---

## Performance Notes

- **Column detection**: Scans first 50 deals in <10ms
- **Dynamic columns**: Added at runtime from rawColumns
- **Storage impact**: +500 bytes per deal for rawColumns
- **Total storage**: ~6000 deals × 1.5KB = ~9 MB (under 10MB limit)

---

## Next Testing Phase

1. ✅ Verify all 17 columns appear in UI
2. ✅ Enable "Absentee-Run" and verify data displays
3. ✅ Test hiding multiple deals
4. ✅ Test "Show Hidden" toggle
5. ✅ Verify name column wraps when expanded
6. ✅ Test both fetch buttons
7. ✅ Test custom Buy Box filter on "Absentee-Run"

Once all tests pass, ready to merge to main! 🚀

---

## Commits

- **v3.0.5**: Google Sheets sheet tab fix
- **v3.0.6**: Hidden deals system + rawColumns preservation
- **v3.0.7**: Complete column support (all A:Q columns) ← Current
