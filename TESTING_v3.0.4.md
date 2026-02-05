# Testing Guide - Version 3.0.4 (Google Sheets Debugging)

## Current Issue

From the console screenshot, we see:
- ✅ 6808 deals loaded from storage  
- ❌ All deals show as "Deal 3", "Deal 997" with null values
- ❌ No askingPrice, ebitda, location, industry data

**Root cause**: The Google Sheets column mapping isn't matching your actual sheet structure.

---

## Testing Steps

### Step 1: Clear Old Data First

To start fresh, open the browser console (F12) and run:

```javascript
await clearAggregatedDeals();
```

This will delete all old deals so we only see fresh Google Sheets data.

### Step 2: Reload Extension

1. Go to `chrome://extensions`
2. Find "Max Price Deal Analyzer"
3. Click **Reload**

### Step 3: Open Dashboard with Console

1. Press **F12** to open Developer Tools
2. Clear the console (🚫 icon)
3. Open the Deals Dashboard
4. Go to "Manage Sources" tab

### Step 4: Test Google Sheets Fetch

1. Find your Google Sheet in the sources list
2. Click the **🔄 Fetch** button next to it
3. Watch the console for detailed logs

### Step 5: Look for These Debug Messages

```
🔍 Google Sheets Headers (first 10): ["Date Added", "Name", "Industry", ...]
🔍 Column indices: {name: 1, price: 11, ebitda: 9, ...}
🔍 Row 1 sample values (first 10): ["2025-01-15", "ABC Restaurant", "Food", ...]
🔍 Parsed deal 1: {name: "ABC Restaurant", askingPrice: 500000, ebitda: 125000, ...}
```

### Step 6: Share the Output

Please copy and paste these specific console lines:

1. **`🔍 Google Sheets Headers (first 10):`** - Shows your actual column names
2. **`🔍 Column indices:`** - Shows which columns were matched
3. **`🔍 Row 1 sample values:`** - Shows the actual data in row 1
4. **`🔍 Parsed deal 1:`** - Shows what the parser extracted

---

## What We're Looking For

The debug output will reveal:

### 1. Column Name Mismatch

If your sheet has:
```
Headers: ["Date", "Business Name", "Type", "Price", "Profit", ...]
```

But the parser expects:
```
Expected: ["Date Added", "Name", "Industry", "Asking Price", "EBITDA", ...]
```

Then `colIndices.name` will be `-1` (not found), causing issues.

### 2. Data in Wrong Columns

If the parser thinks:
- Column 1 = Name
- Column 11 = Asking Price

But your sheet has:
- Column 1 = Date
- Column 5 = Asking Price

Then it will extract the wrong data.

### 3. Empty Columns

If your sheet has empty cells where data should be, the parser will return null values.

---

## Common Issues & Fixes

### Issue 1: Column Names Don't Match

**Symptom**: `colIndices.price: -1` (not found)

**Fix**: The parser looks for these names (case-insensitive):
- Name: "name", "business name", "deal name", "title"
- Price: "asking price", "asking", "price", "sale price"
- EBITDA: "annual profit", "ebitda", "sde", "cash flow", "earnings"

Make sure your Google Sheet columns match at least one of these.

### Issue 2: Data in Different Format

**Symptom**: `askingPrice: null` even though column matched

**Fix**: Price parsing expects:
- `$500,000` ✅
- `$500K` ✅
- `500000` ✅
- `Five hundred thousand` ❌

### Issue 3: Protected/Private Sheet

**Symptom**: Fetch fails with auth error

**Fix**: Make sure:
1. Sheet is shared (at least "view" access)
2. OAuth is authorized
3. You're signed into Google in Chrome

---

## Expected Console Output (Good)

```
📦 Deal Analyzer Version: 3.0.4
🔄 Fetching deals from Google Sheets only...
📋 Sheet URL: https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/...
🔍 Google Sheets Headers (first 10): 
  ["Date Added", "Name", "Industry", "Description", "City", "State", "Asking Price", "EBITDA", "Revenue", "Broker"]
🔍 Column indices: 
  {name: 1, price: 6, ebitda: 7, location: -1, city: 4, state: 5, url: 10}
🔍 Row 1 sample values (first 10): 
  ["2025-01-15", "ABC Restaurant", "Food & Beverage", "Established...", "Seattle", "WA", "$500,000", "$125,000", "$800,000", "John Doe"]
🔍 Parsed deal 1: 
  {name: "ABC Restaurant", askingPrice: 500000, ebitda: 125000, location: "Seattle, WA", city: "Seattle", state: "WA", industry: "Food & Beverage", url: "https://..."}
```

---

## Next Steps Based on Output

### If columns match correctly:
✅ Proceed with aggregation  
✅ Data should display in dashboard

### If columns don't match:
1. Share your actual column names
2. I'll update the parser to match your sheet
3. Or you can rename columns to match expected names

### If data is null:
1. Check if cells have formulas that need to load
2. Check if data is in a different sheet tab
3. Verify sheet permissions

---

## Quick Commands

Run these in the browser console (F12):

**Clear all deals:**
```javascript
await clearAggregatedDeals();
```

**Check storage:**
```javascript
const deals = await loadAggregatedDeals();
console.log(`Total: ${deals.length}`);
console.log('First:', deals[0]);
```

**Check custom sources:**
```javascript
const sources = await getCustomSources();
console.log('Sources:', sources);
```

---

## What Changed in v3.0.4

- Added detailed logging for Google Sheets headers
- Added logging for column index mapping
- Added logging for raw cell values (first 3 rows)
- Added logging for parsed deal objects (first 3)
- Helps diagnose column mapping mismatches
