# Testing Guide - v2.1.10
## Unnamed Deal Fix

**Version:** 2.1.10  
**Date:** January 29, 2026  
**Focus:** Eliminate "Unnamed Deal" entries through intelligent name generation

---

## 🎯 What Was Fixed

Previously, deals imported from Google Sheets or RSS feeds without a "name" column would appear as "Unnamed Deal". This made it impossible to distinguish between deals.

**Root Causes Identified:**
1. CSV parser defaulted to 'Unnamed Deal' when name column was missing/empty
2. RSS parser required title field, but didn't have smart fallbacks
3. No post-load sanitization to fix unnamed deals in storage

**Solutions Implemented:**
1. ✅ Smart name generation with multiple fallback strategies
2. ✅ Improved column mapping with logging
3. ✅ Post-load sanitization to fix existing unnamed deals
4. ✅ Better error logging to trace issues

---

## 🧪 Test Cases

### Test Case 1: Google Sheets Without Name Column

**Setup:**
```
Create a Google Sheet with columns:
- Description: "Profitable SaaS business with 500 customers"
- Industry: "SaaS"
- Location: "Austin, TX"
- Price: "$500,000"
- URL: "https://example.com/deal1"
```

**Expected Behavior:**
- Deal name should be: "Profitable SaaS business with 500 customers" (from description)
- Console shows: "📋 CSV Headers found: [...]"
- Console shows: "📊 Column mapping: { name: 'NOT FOUND', ... }"
- Console shows: "✅ Successfully parsed 1 deals from CSV"

**Fallback Priority (if description is empty):**
1. Industry + Location → "SaaS Business in Austin, TX"
2. Industry only → "SaaS Business"
3. Location only → "Business in Austin, TX"
4. Domain from URL → "Business - example.com"
5. Row number → "Deal #1"

---

### Test Case 2: RSS Feed Without Title

**Setup:**
```xml
<item>
  <link>https://bizforsale.com/deal123</link>
  <description>Small manufacturing company in Detroit</description>
  <pubDate>Thu, 29 Jan 2026 12:00:00 GMT</pubDate>
</item>
```

**Expected Behavior:**
- Deal name should be: "Small manufacturing company in Detroit"
- If description has multiple sentences, uses first sentence
- If too long, truncates to 97 chars + "..."

**Console Logging:**
- "⚠️ RSS item missing title, using fallback name" (only if title is truly missing)

---

### Test Case 3: Existing Unnamed Deals in Storage

**Setup:**
```javascript
// Deals already in storage with name: "Unnamed Deal"
{
  name: "Unnamed Deal",
  description: "Coffee shop in downtown Seattle",
  industry: "Food & Beverage",
  location: "Seattle, WA",
  url: "https://example.com"
}
```

**Expected Behavior:**
- On load, dashboard sanitizes the name
- Console shows: "⚠️ Found unnamed deal, attempting to generate name: {...}"
- Console shows: "✓ Fixed deal name: 'Unnamed Deal' → 'Coffee shop in downtown Seattle'"
- Console shows: "✅ Fixed 1 unnamed deal(s)"
- Deal appears in dashboard with proper name
- Storage is updated with new name

---

### Test Case 4: Minimal Data Deal

**Setup:**
```javascript
{
  name: "",
  url: "https://bizquest.com/listing/abc123",
  description: "",
  industry: "",
  location: ""
}
```

**Expected Behavior:**
- Last resort fallback: "Business - bizquest.com" (extracted from URL)
- If URL also invalid: "Deal from 1/29/2026" (uses timestamp)
- Console shows: "❌ Could not generate meaningful name for deal: {...}"

---

## 🔍 Manual Testing Steps

### Step 1: Test Google Sheets Import
1. Create a test Google Sheet with these columns:
   - Industry, Location, Price, EBITDA, Description, URL
   - **Important:** Do NOT include a "Name" column
2. Add 3-5 test rows with varying data completeness
3. Add the sheet as a custom source in the dashboard
4. Click "Fetch Deals"
5. Open browser console and verify:
   - ✅ "📋 CSV Headers found: [...]"
   - ✅ "📊 Column mapping: { name: 'NOT FOUND', ... }"
   - ✅ "✅ Successfully parsed X deals from CSV"
   - ✅ No "Unnamed Deal" entries appear
6. Check each deal has a meaningful name

### Step 2: Test Post-Load Sanitization
1. Manually add an "Unnamed Deal" to Chrome storage:
   ```javascript
   chrome.storage.local.get(['savedDeals'], (result) => {
     const deals = result.savedDeals || [];
     deals.push({
       name: "Unnamed Deal",
       url: "https://test.com",
       description: "Test restaurant in NYC",
       savedAt: Date.now(),
       inputs: { businessName: "Test Restaurant" },
       results: {}
     });
     chrome.storage.local.set({ savedDeals: deals });
   });
   ```
2. Refresh the dashboard
3. Check console for:
   - ✅ "⚠️ Found unnamed deal, attempting to generate name: {...}"
   - ✅ "✓ Fixed deal name: 'Unnamed Deal' → 'Test restaurant in NYC'"
   - ✅ "✅ Fixed 1 unnamed deal(s)"
4. Verify deal now shows proper name in dashboard

### Step 3: Test RSS Feed
1. Add an RSS feed URL to the dashboard
2. Fetch deals
3. Check console for proper name generation
4. Verify no "Unnamed Deal" entries

### Step 4: Edge Cases
1. Test with completely empty deal (only URL)
2. Test with very long descriptions (>100 chars)
3. Test with special characters in names
4. Test with non-English characters

---

## 🐛 Debugging

### Console Commands

**Check for unnamed deals:**
```javascript
chrome.storage.local.get(['savedDeals'], (result) => {
  const unnamed = result.savedDeals.filter(d => 
    !d.name || d.name === 'Unnamed Deal' || d.name.trim() === ''
  );
  console.log(`Found ${unnamed.length} unnamed deals:`, unnamed);
});
```

**Force sanitization:**
```javascript
// In deals-dashboard.js console
allDeals.forEach(deal => {
  console.log('Before:', deal.name);
  deal.name = sanitizeDealName(deal);
  console.log('After:', deal.name);
});
```

**Test name generation:**
```javascript
// In custom-source-manager.js
const testDeal = {
  description: "Great business opportunity",
  industry: "Tech",
  location: "SF",
  url: "https://example.com/deal"
};
const values = ['', 'https://example.com/deal', '$500k', '', 'SF', 'Tech', 'Great business'];
const indices = { name: -1, url: 1, price: 2, ebitda: 3, location: 4, industry: 5, description: 6 };
console.log(generateDealName(values, indices, 1));
```

---

## 📊 Expected Console Output

### Successful Google Sheets Import:
```
📊 Fetching Google Sheets: My Deal Source
📋 CSV Headers found: ["Industry", "Location", "Price", "EBITDA", "Description", "URL"]
📊 Column mapping: {
  name: "NOT FOUND",
  url: "URL",
  industry: "Industry",
  location: "Location"
}
✅ Successfully parsed 5 deals from CSV
✅ Parsed 5 deals from Google Sheets
```

### Successful Name Sanitization on Load:
```
⚠️ Found unnamed deal, attempting to generate name: { name: "Unnamed Deal", ... }
✓ Fixed deal name: "Unnamed Deal" → "Coffee shop in downtown Seattle"
✓ Fixed deal name: "Unnamed Deal" → "SaaS Business in Austin, TX"
✅ Fixed 2 unnamed deal(s)
Loaded 10 deals
```

### Fallback to Last Resort:
```
⚠️ Could not extract name for row 3, using fallback name
❌ Could not generate meaningful name for deal: { name: "", url: "", ... }
```

---

## ✅ Success Criteria

- [ ] No deals appear as "Unnamed Deal" in dashboard
- [ ] Console shows proper logging for name generation
- [ ] Existing unnamed deals are automatically fixed on load
- [ ] All fallback strategies work correctly
- [ ] Names are meaningful and descriptive
- [ ] Edge cases are handled gracefully
- [ ] No JavaScript errors in console
- [ ] Storage is updated with corrected names

---

## 📝 Known Limitations

1. **Extremely minimal data:** If a deal has no name, description, industry, location, or valid URL, it will fall back to "Deal #[row]" or timestamp
2. **Non-English text:** May not properly sentence-split non-English descriptions
3. **HTML in descriptions:** RSS descriptions with heavy HTML may not extract clean text
4. **Performance:** Large CSV files (>1000 rows) may take longer due to name generation logic

---

## 🔄 Rollback Plan

If issues occur, revert these files:
- `utils/custom-source-manager.js`
- `scrapers/rss-parser.js`
- `deals-dashboard.js`
- `manifest.json`

Git revert command:
```bash
git checkout HEAD~1 -- utils/custom-source-manager.js scrapers/rss-parser.js deals-dashboard.js manifest.json
```

---

## 📚 Related Documentation

- `utils/custom-source-manager.js` - CSV parsing and name generation
- `scrapers/rss-parser.js` - RSS feed parsing and name generation
- `deals-dashboard.js` - Post-load sanitization
- `CUSTOM_SOURCES_GUIDE_v2.1.0.md` - Custom source configuration
