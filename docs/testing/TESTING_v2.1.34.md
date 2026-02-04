# Testing Guide: v2.1.34 - Column W URL Extraction

## What Changed

Updated the hyperlink extraction to:
- ✅ Use **Column W** (index 22) instead of Column V
- ✅ Work with **edit URLs** (not just published URLs)
- ✅ Simplified code - removed old fallback strategies
- ✅ Better logging for debugging

## Your Specific Sheet

**URL:** `https://docs.google.com/spreadsheets/d/1DPUTcAQrddeEGUIgc3YkNwfdfI8_FbHhUmouZnxdNWY/edit?gid=697021806#gid=697021806`

**URL Column:** Column W (index 22)

## Quick Test Steps

### 1. Reload Extension
- Go to `chrome://extensions/`
- Find "Max Price Deal Analyzer"
- Click the **reload** button (circular arrow icon)

### 2. Open Dashboard
- Click the extension icon on any webpage
- Dashboard should open

### 3. Add/Update Google Sheets Source
- Click **⚙️ Manage Sources**
- If you already have a Google Sheets source, click **Edit**
- If not, click **Add Source** → **Google Sheets**
- Paste your URL:
  ```
  https://docs.google.com/spreadsheets/d/1DPUTcAQrddeEGUIgc3YkNwfdfI8_FbHhUmouZnxdNWY/edit?gid=697021806#gid=697021806
  ```
- Click **Save**

### 4. Test Fetch
- Click **Test** button on your Google Sheets source
- **Watch for:**
  - A temporary tab will open with your Google Sheet
  - It will automatically close after ~5-10 seconds
  - Console will show progress logs

### 5. Check Console Output

Open browser console (F12 → Console tab) and look for:

```
📋 Sheet URL: https://docs.google.com/spreadsheets/d/1DPUTcAQrddeEGUIgc3YkNwfdfI8_FbHhUmouZnxdNWY/...
🎯 Strategy: Fetch CSV data + Extract hyperlinks from rendered page
Step 1: Fetching CSV data from: https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=697021806
✅ Got CSV (XXXXX chars)
✅ Parsed XX deals from CSV
Step 2: Extracting hyperlinks from rendered page: https://docs.google.com/spreadsheets/d/.../pubhtml?gid=697021806&single=true
🔗 Looking for URLs in column W (index 22)
🔗 Requesting background script to extract hyperlinks...
```

Then in the background console (click "service worker" link in `chrome://extensions/`):

```
🔗 Background: Extracting hyperlinks from: https://docs.google.com/...
📄 Background: Sheet loaded, extracting hyperlinks...
✅ Background: Extracted XX hyperlinks from YY rows
```

Back in the page console:

```
✅ Received XX hyperlinks from background
📊 Merging XX hyperlinks with YY deals...
🎉 Successfully merged! XX/YY deals now have URLs
```

### 6. Verify in Dashboard

After successful fetch:
- Deals should appear in the table
- Click on any deal to open the detail panel
- Check the **View Original Listing** button at the bottom:
  - Should be visible
  - Should have a valid URL (not "No Listing URL Available")
  - Should open the correct listing when clicked

## Expected Behavior

### ✅ Success Indicators

1. **Temporary tab opens and closes** - You'll briefly see your Google Sheet open in a new tab, then it auto-closes
2. **Console shows extraction** - Both page console and background console show successful extraction
3. **URLs are present** - Deals have valid URLs in the `url` field
4. **Button works** - "View Original Listing" button opens the correct listing

### ⚠️ Potential Issues

**Issue: "No hyperlinks extracted"**
- Check that URLs are actually in Column W
- Verify the sheet has data in the rows
- Make sure Column W contains `=HYPERLINK()` formulas or direct URLs

**Issue: "Background script returned no hyperlinks"**
- Check the background console for errors (click "service worker" in extensions page)
- Verify the sheet is publicly accessible (at least "Anyone with the link can view")
- Try refreshing the extension

**Issue: "Timeout waiting for sheet to load"**
- The sheet might be very large
- Try again - sometimes Google Sheets loads slowly
- Check your internet connection

## Column Mapping Reference

Your sheet should have these columns (approximate):
- Column A-U: Various deal data (name, price, location, etc.)
- **Column W: Listing URLs** ← This is what we're extracting!

The code looks for column W specifically (index 22, where A=0, B=1, ... W=22).

## Debug Tips

### View Background Console
1. Go to `chrome://extensions/`
2. Find "Max Price Deal Analyzer"
3. Click **"service worker"** link (appears when extension is active)
4. This opens the background script console where you can see tab creation and script injection logs

### Check Permissions
- Make sure the extension has permission to access `docs.google.com`
- If prompted, click **Allow** when reloading the extension

### Manual Verification
1. Open your sheet manually in a browser
2. Click on a cell in Column W
3. Verify it contains a `=HYPERLINK()` formula or direct URL
4. Try clicking the link to ensure it works

## What Happens Behind the Scenes

1. **CSV Fetch** - Downloads all deal data (name, price, description, etc.) from Google Sheets as CSV
2. **Tab Creation** - Background script opens your sheet in a hidden tab
3. **Wait for Load** - Waits 5 seconds for JavaScript to render the table
4. **Script Injection** - Injects code to find `table.waffle` and extract `<a>` tags from Column W
5. **URL Extraction** - Pulls the `href` from each link, cleans up Google redirects
6. **Data Merge** - Combines URLs with CSV data row-by-row
7. **Cleanup** - Closes the temporary tab
8. **Display** - Shows deals with URLs in the dashboard

## Version Info

- **Version:** 2.1.34
- **Date:** January 29, 2026
- **Key Change:** Column W (index 22) for URL extraction
- **Sheet:** Works with both edit URLs and published URLs
