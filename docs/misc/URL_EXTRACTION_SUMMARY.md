# URL Extraction Solution Summary

## The Problem

Google Sheets `=HYPERLINK()` formulas don't export their underlying URLs when using standard export methods:
- ❌ CSV export shows only the display text
- ❌ HTML fetch returns JavaScript-rendered content (CORS blocked)
- ❌ JSON API doesn't include hyperlink data

## The Solution (v2.1.34)

**Background Script Tab Injection** - A creative workaround that:

1. Opens the Google Sheet in a temporary hidden tab
2. Waits for JavaScript to render the table with actual `<a>` tags
3. Injects a script to extract `href` attributes from Column W
4. Merges extracted URLs with CSV data
5. Auto-closes the temporary tab

## How It Works

```
User clicks "Fetch"
    ↓
Extension fetches CSV (all data except URLs)
    ↓
Background script creates hidden tab with sheet URL
    ↓
Tab loads → JavaScript renders table with <a> tags
    ↓
Injected script extracts hrefs from Column W (index 22)
    ↓
URLs sent back to content script via message passing
    ↓
URLs merged with CSV data row-by-row
    ↓
Complete deals (with URLs) displayed in dashboard
    ↓
Temporary tab auto-closes
```

## Technical Details

### Files Modified

1. **`manifest.json`**
   - Added `scripting` permission
   - Added `host_permissions` for `docs.google.com`

2. **`background.js`**
   - New message listener for `extractHyperlinks` action
   - Tab creation and management
   - Script injection into Google Sheets tab
   - URL extraction and cleanup logic

3. **`utils/custom-source-manager.js`**
   - Updated `fetchGoogleSheets()` to always use background script
   - Changed column index from 21 (V) to 22 (W)
   - Simplified to remove old fallback strategies
   - Added message passing to background script

### Column Index Reference

```
A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8, J=9,
K=10, L=11, M=12, N=13, O=14, P=15, Q=16, R=17, S=18, T=19,
U=20, V=21, W=22, X=23, Y=24, Z=25
```

**Column W = Index 22** ← Where listing URLs are stored

### Script Injection Code

The background script injects this function into the Google Sheets tab:

```javascript
(colIndex) => {
  const table = document.querySelector('table.waffle') || document.querySelector('table');
  const rows = table.querySelectorAll('tr');
  const hyperlinks = [];
  
  for (let i = 1; i < rows.length; i++) { // Skip header
    const cells = rows[i].querySelectorAll('td');
    if (cells[colIndex]) {
      const link = cells[colIndex].querySelector('a');
      if (link && link.href) {
        let url = link.href;
        // Clean up Google redirect URLs
        if (url.includes('google.com/url?')) {
          const match = url.match(/[?&](?:q|url)=([^&]+)/);
          if (match) url = decodeURIComponent(match[1]);
        }
        hyperlinks.push(url);
      } else {
        hyperlinks.push('');
      }
    }
  }
  
  return { success: true, hyperlinks };
}
```

## Advantages

✅ **No sheet modification required** - Works with sheets you don't own
✅ **Extracts actual URLs** - Gets the real hyperlink targets
✅ **Automatic cleanup** - Removes Google redirect wrappers
✅ **Works with edit URLs** - Not limited to published sheets
✅ **Non-intrusive** - Temporary tab opens in background
✅ **Self-cleaning** - Tab auto-closes after extraction

## Limitations

⚠️ **5-10 second delay** - Must wait for sheet to load and render
⚠️ **Requires permissions** - User must grant access to `docs.google.com`
⚠️ **Single column** - Currently only extracts from Column W
⚠️ **Visible tab flash** - Brief tab creation (though in background)
⚠️ **Sheet must be accessible** - Requires "Anyone with link" view permission

## User Experience

### What User Sees

1. Clicks "Test" or "Fetch" button
2. Brief pause (~5-10 seconds)
3. Temporary tab appears in tab bar, then disappears
4. Deals populate in dashboard with working URLs
5. "View Original Listing" button works correctly

### What User Doesn't See

- CSV fetch happening
- Script injection
- URL extraction process
- Data merging
- Tab cleanup

## Future Improvements

### Possible Enhancements

1. **Configurable column** - Let user specify which column contains URLs
2. **Multiple URL columns** - Extract from multiple columns simultaneously
3. **Progress indicator** - Show "Extracting URLs..." message during wait
4. **Faster loading** - Optimize wait time based on actual render completion
5. **Retry logic** - Auto-retry if extraction fails
6. **Batch processing** - Extract URLs for multiple sheets in parallel

### Alternative Approaches (Not Implemented)

- **Google Sheets API** - Requires API key and OAuth setup
- **Google Apps Script proxy** - Requires deploying a web service
- **Browser automation** - Would require Puppeteer or similar (too heavy)
- **User modification** - Asking sheet owner to add URL column (not viable)

## Comparison to Previous Attempts

| Approach | v2.1.30 | v2.1.31 | v2.1.32 | v2.1.33 | v2.1.34 |
|----------|---------|---------|---------|---------|---------|
| Method | HTML fetch | CSV only | Iframe | Background tab | Background tab |
| URLs Extracted | ❌ No | ❌ No | ❌ CORS | ✅ Yes | ✅ Yes |
| Column | V (21) | V (21) | V (21) | V (21) | W (22) |
| Sheet Type | Published | Published | Published | Both | Both |

## Testing Checklist

- [ ] Extension reloaded at `chrome://extensions/`
- [ ] Permissions granted for `docs.google.com`
- [ ] Google Sheets source configured with correct URL
- [ ] Test button clicked
- [ ] Temporary tab observed opening/closing
- [ ] Console logs show successful extraction
- [ ] Deals appear in dashboard table
- [ ] Deal detail panel shows URL
- [ ] "View Original Listing" button works
- [ ] URLs open correct listings

## Support

If URL extraction fails:

1. **Check sheet permissions** - Must be "Anyone with link can view"
2. **Verify Column W** - Ensure URLs are in Column W, not another column
3. **Check background console** - Look for errors in service worker console
4. **Try manual open** - Open the sheet URL manually to verify it loads
5. **Check internet** - Ensure stable connection to Google Sheets
6. **Reload extension** - Sometimes helps clear cached permissions

## Version History

- **v2.1.30** - Attempted HTML parsing (failed due to JS rendering)
- **v2.1.31** - Switched to CSV only (lost URLs)
- **v2.1.32** - Tried iframe approach (CORS blocked)
- **v2.1.33** - Background script tab injection (worked!)
- **v2.1.34** - Updated to Column W, simplified code ← **Current**

---

**Status:** ✅ Working solution
**Last Updated:** January 29, 2026
**Version:** 2.1.34
