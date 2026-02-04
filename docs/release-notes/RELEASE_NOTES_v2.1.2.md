# Release Notes - v2.1.2

**Release Date:** January 25, 2026

## Summary
Fixed button functionality and enhanced deal aggregation to support Google Sheets and custom sources. This release focuses on making the "Fetch Deals", "Manage Sources", and "Add Deal" buttons fully functional, with special emphasis on Google Sheets integration.

---

## ✨ What's New

### Enhanced Deal Aggregation
- **Fetch Deals** now fetches from BOTH RSS feeds AND custom sources (Google Sheets, CSV)
- Shows breakdown of deals fetched from each source type
- Better error handling - continues fetching even if some sources fail

### Google Sheets Integration
- Full support for adding Google Sheets as deal sources
- Automatic URL conversion (from sharing URL to CSV export URL)
- Handles sheet tab IDs (gid parameter)
- Smart column mapping for common field names

### Improved Button Functionality
- All top control buttons now fully functional:
  - **Fetch Deals** - Aggregates from all sources
  - **Manage Sources** - Opens source management modal
  - **Add Deal** - Opens manual deal entry form
  - **Configure Buy Box** - Shows coming soon message
- Added debugging logs to help troubleshoot issues

---

## 🔧 Changes Made

### Files Modified
- `deals-dashboard.js` - Enhanced aggregation function, added debugging, fixed button handlers
- `manifest.json` - Version bump to 2.1.2
- `deals-dashboard.html` - Version display updated

### Key Code Changes

1. **Enhanced `startAggregation()` function:**
   - Now fetches RSS feeds AND custom sources
   - Shows detailed breakdown in toast notifications
   - Continues even if some sources fail
   - Better error messages

2. **Added debugging:**
   - Console logs verify all required functions are loaded
   - Button click handlers log actions for troubleshooting
   - Function availability checks before calling

3. **Google Sheets Support:**
   - Uses existing `parseGoogleSheetsUrl()` function
   - Converts sharing URLs to CSV export URLs automatically
   - Handles both `/edit` and `/edit#gid=X` URL formats

---

## 📋 How to Add a Google Sheet

### Step 1: Prepare Your Google Sheet
1. Create a Google Sheet with your deal data
2. Include columns like: Name, URL, Price, EBITDA, Location, Industry, Description
3. **Important:** Share the sheet with "Anyone with the link can view" permission

### Step 2: Add as Source
1. Click **"Manage Sources"** button in Deal Aggregator
2. Click the **"Google Sheets"** card
3. Enter a name for your source (e.g., "My Deal Pipeline")
4. Paste the Google Sheets URL (e.g., `https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0`)
5. Click **"Add Source"**

### Step 3: Fetch Deals
1. Click **"Fetch Deals"** button
2. The system will:
   - Convert your Google Sheets URL to CSV format
   - Download and parse the CSV
   - Map columns automatically (looks for common field names)
   - Add deals to the aggregated pool

### Step 4: View Results
- Deals will appear in the Deal Aggregator table
- You can save individual deals to "My Deals"
- Source will show in the "Manage Sources" list with deal count

---

## 🧪 Testing Checklist

### Button Functionality
- [ ] "Fetch Deals" button fetches RSS feeds
- [ ] "Fetch Deals" button fetches custom sources (if added)
- [ ] "Manage Sources" button opens modal
- [ ] "Add Deal" button opens manual entry form
- [ ] "Configure Buy Box" shows coming soon message

### Google Sheets Integration
- [ ] Can add Google Sheet as source
- [ ] URL conversion works correctly
- [ ] CSV parsing extracts deals correctly
- [ ] Column mapping works for common field names
- [ ] Deals appear in aggregator table after fetch
- [ ] Source shows correct deal count

### Error Handling
- [ ] Invalid Google Sheets URL shows helpful error
- [ ] Private sheets show permission error
- [ ] Missing columns handled gracefully
- [ ] Fetch continues even if one source fails

---

## 🐛 Bug Fixes

1. **Fixed:** "Fetch Deals" only fetched RSS feeds, now fetches custom sources too
2. **Fixed:** Button event listeners weren't properly attached
3. **Fixed:** Missing error handling for unavailable functions

---

## 📝 Notes

### Google Sheets Requirements
- Sheet must be shared with "Anyone with the link can view"
- First row should contain column headers
- Common column names are auto-detected:
  - Name: "name", "business name", "deal name", "title"
  - URL: "url", "link", "listing url", "website"
  - Price: "price", "asking price", "asking", "sale price"
  - EBITDA: "ebitda", "sde", "cash flow", "earnings"
  - Location: "location", "city", "address", "region"
  - Industry: "industry", "sector", "category", "type"

### CSV Format Support
- Also supports direct CSV file URLs
- Handles quoted fields and commas in values
- Parses prices in formats: $500K, $2.5M, $500000

---

## 🚀 Next Steps

1. **Scraping Plans** - Focus on implementing automated scraping schedules
2. **Column Mapping UI** - Allow users to manually map columns if auto-detection fails
3. **Source Testing** - Add "Test Source" button to verify before adding
4. **Deal Deduplication** - Improve duplicate detection across sources

---

## Version History
- **v2.1.2** - Google Sheets integration + button fixes (Current)
- **v2.1.1** - Always-visible aggregator controls
- **v2.1.0** - Deal Aggregator Phase 2 launch
- **v2.0.0** - Complete platform redesign with journey stages
