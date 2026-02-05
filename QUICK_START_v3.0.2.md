# Quick Start Guide - Version 3.0.2

## What Changed?

Version 3.0.2 focuses exclusively on **Google Sheets data** and keeps the **6000 most recent deals**.

### RSS Feeds: Disabled
### Google Sheets: Primary source
### Storage Limit: 6000 deals (most recent)

---

## Setup Instructions

### 1. Reload the Extension
- Go to `chrome://extensions`
- Find "Max Price Deal Analyzer"
- Click the **Reload** button

### 2. Open the Dashboard
- Click the extension icon in Chrome toolbar
- Or navigate to any business listing page

### 3. Add Your Google Sheet (if not already added)

**Go to "Manage Sources" tab:**
1. Click **"Add Custom Source"**
2. Enter:
   - **Name**: My Deals Sheet (or any name)
   - **Type**: Google Sheets
   - **URL**: Your Google Sheets URL
3. Click **"Add Source"**
4. Authorize Google Sheets access when prompted

### 4. Aggregate Deals

**Go to "Deal Aggregator" tab:**
1. Click **"Aggregate All Deals"** button
2. Wait for completion (should be fast)
3. Success message will show: "✅ Added X new deals. Total: X deals (max 6000)"

### 5. View Your Deals

- Deals appear in the table automatically
- Use filters to narrow down results
- Click any deal row to see full details

---

## Console Monitoring (Optional)

Press **F12** to open Developer Console and see detailed logs:

```
📦 Deal Analyzer Version: 3.0.2
ℹ️ RSS feeds disabled - Google Sheets only mode
ℹ️ Storage limit: 6000 most recent deals
📥 Fetched 414 deals from Google Sheets
✅ Added 414 new deals (0 duplicates). Total: 414 deals (max 6000)
📊 Deals by source type: {google_sheets: 414}
```

---

## Troubleshooting

### No deals showing up?

1. **Check if Google Sheet is added**:
   - Go to "Manage Sources" tab
   - Verify your sheet is listed and enabled
   - Click the fetch icon (🔄) to test

2. **Check OAuth authorization**:
   - If prompted, authorize Google Sheets access
   - Ensure you're signed into Google in Chrome

3. **Check console for errors**:
   - Press F12 → Console tab
   - Look for red error messages
   - Share errors if you need help

### Deals disappearing after aggregation?

- This is normal if you had >6000 old deals
- System keeps only the 6000 most recent deals
- Older deals are automatically pruned

### Want to start fresh?

Run this in the browser console (F12):
```javascript
await clearAggregatedDeals();
```
Then click "Aggregate All Deals" again.

---

## Key Features

### ✅ What Works Now
- ✅ Google Sheets import with OAuth
- ✅ Automatic deal parsing (all columns)
- ✅ Hyperlink extraction from "View Listing" column
- ✅ 6000 deal limit (most recent kept)
- ✅ Buy Box filtering
- ✅ Deal detail panel
- ✅ Export to PDF
- ✅ Save to "My Deals"
- ✅ Column visibility controls
- ✅ Search and filters

### ⏸️ Currently Disabled
- ⏸️ RSS feed aggregation (can be re-enabled if needed)

---

## Data Flow

```
Google Sheets
    ↓
Chrome Identity API (OAuth)
    ↓
JavaScript Parser (custom-source-manager.js)
    ↓
Deal Objects with Full Data
    ↓
Storage Manager (keeps 6000 most recent)
    ↓
Chrome Storage (local)
    ↓
Dashboard Display
```

---

## Storage Info

- **Limit**: 6000 deals
- **Size**: ~4-5 MB (well under Chrome's 10MB limit)
- **Pruning**: Automatic (keeps most recent)
- **Recency Priority**: Deals added today get highest priority

---

## Column Mapping

The parser automatically maps these Google Sheet columns:

| Google Sheet Column | Deal Property |
|-------------------|--------------|
| Date Added | discoveredAt |
| Name | name |
| Industry | industry |
| Description | description |
| City | city |
| County | county |
| State | state |
| Country | country |
| Years Established | yearsEstablished |
| Annual Profit | ebitda |
| Annual Revenue | revenue |
| Asking Price | askingPrice |
| Profit Multiple | profitMultiple |
| Revenue Multiple | revenueMultiple |
| Remote/Relocatable | remote |
| Franchise | franchise |
| Broker Name | brokerName |
| Broker Company | brokerCompany |
| Broker Contact | brokerPhone |
| Broker Email | brokerEmail |
| View Listing | url (hyperlink extracted) |

**Note**: Column names are matched flexibly (case-insensitive, partial matches).

---

## Need Help?

1. Check the console (F12) for error messages
2. Review the fix summaries:
   - `docs/implementation/FIX_SUMMARY_v3.0.1.md`
   - `docs/implementation/FIX_SUMMARY_v3.0.2.md`
3. Check Google Sheets permissions
4. Verify sheet structure matches expected columns

---

## Version Info

- **Version**: 3.0.2
- **Focus**: Google Sheets only
- **Limit**: 6000 most recent deals
- **Storage**: ~48% of Chrome limit
- **Performance**: Optimized for speed
