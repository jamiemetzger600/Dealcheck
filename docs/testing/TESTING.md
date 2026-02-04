# Testing Guide for v1.5.0

## How to Test the New Features

### Setup
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select the extension folder
4. OR click the reload icon if already loaded

---

## 🆕 NEW IN v1.5.0: Enhanced Multi-Platform Scraping

### Feature: Platform Detection & Scraping 🔍

**Test Steps:**

1. **BizQuest Test:**
   - Navigate to https://www.bizquest.com/
   - Find any business listing with financial details
   - Click extension icon to open
   - Check that data auto-populates
   - Open console (F12) and look for "Platform detected: bizquest"

2. **BizBuySell Test:**
   - Navigate to https://www.bizbuysell.com/
   - Find any business listing
   - Click extension icon
   - Verify EBITDA/SDE and Asking Price populate
   - Check console for "Platform detected: bizbuysell"

3. **Crexi Test (Commercial Real Estate):**
   - Navigate to https://www.crexi.com/
   - Find a property with NOI listed
   - Open extension
   - Verify asking price and NOI populate
   - Check console for "Platform detected: crexi"

4. **LoopNet Test:**
   - Navigate to https://www.loopnet.com/
   - Find a commercial property
   - Open extension
   - Verify data scraping
   - Check console for "Platform detected: loopnet"

5. **Zillow Test:**
   - Navigate to https://www.zillow.com/
   - Find a commercial/investment property
   - Open extension
   - Check if price populates

6. **Redfin Test:**
   - Navigate to https://www.redfin.com/
   - Find any listing
   - Open extension
   - Verify price scraping

**Expected Results:**
- ✅ Platform correctly detected (see console)
- ✅ Asking Price populates automatically
- ✅ EBITDA/SDE/NOI populates (if available on page)
- ✅ Console shows detailed scraping logs with strategies
- ✅ "Platform scraper" attempts logged before "Generic scraper"

---

### Feature: Scraping Diagnostics Panel 🛠️

**Test Steps:**

1. Open extension on any listing page
2. Click the **🔍 debug icon** in the header (next to settings)
3. Observe the diagnostics modal:
   - Current URL displayed
   - Platform detected
   - Status (Data Found / No Data Found)
   - Asking Price value or "Not found"
   - EBITDA/SDE value or "Not found"

4. **Test Re-scrape:**
   - Click "🔄 Re-scrape Page" button
   - Wait a moment
   - Check that diagnostics update

5. **Test Console Button:**
   - Click "📋 Open Console (F12)" button
   - Should see helpful alert

6. **Test on Page With No Data:**
   - Go to a search results page (not a listing)
   - Open extension and diagnostics
   - Should show "No Data Found" with red indicators

7. **Test on Supported Platform:**
   - Go to BizQuest listing
   - Open diagnostics
   - Should show green "Data Found" status
   - Platform should be "bizquest" in blue/green

**Expected Results:**
- ✅ Diagnostics modal opens/closes smoothly
- ✅ Shows current scraping status
- ✅ Color coding: green = found, red = not found
- ✅ Re-scrape button works
- ✅ Helpful troubleshooting tips visible
- ✅ Platform name displayed correctly

---

### Feature: Enhanced Currency Parsing 💰

**Test Cases:**

Test on pages that use abbreviated formats:

1. **1.5M format:**
   - Find a listing showing "$1.5M"
   - Open extension
   - Should parse as $1,500,000

2. **500K format:**
   - Find a listing showing "$500K" or "500k"
   - Open extension
   - Should parse as $500,000

3. **2.3B format:**
   - Find a listing showing "$2.3B" (rare, but supported)
   - Should parse as $2,300,000,000

4. **Standard formats still work:**
   - "$1,500,000" → $1,500,000
   - "$1500000" → $1,500,000
   - "1,500,000" → $1,500,000

**Expected Results:**
- ✅ All abbreviation formats parsed correctly
- ✅ Standard comma-separated formats still work
- ✅ Console shows parsed values

---

### Feature: Console Logging 📋

**Test Steps:**

1. Open any listing page
2. Open browser console (F12)
3. Click extension icon to open
4. Watch console output

**Expected Console Output:**
```
🔄 Starting scrapeData...
📍 Current URL: https://...
🏢 Platform detected: bizquest
🎯 Attempting bizquest-specific scraper...
  ✅ Found asking price in details: 1500000
  ✅ Found SDE/Cash Flow in details: 450000
✅ Platform scraper found asking price: 1500000
✅ Platform scraper found EBITDA/SDE: 450000 (SDE)
✅ Updated Asking Price field: $1,500,000
⚠️ SDE detected, subtracting $200k for owner salary
   Original SDE: $450,000
   After -$200k: $250,000
✅ Updated EBITDA field: $250,000

📋 SCRAPING SUMMARY:
   Platform: bizquest
   Asking Price: $1,500,000
   EBITDA/SDE: $250,000 (SDE)
🏁 Scraping complete, triggering calculation...
```

**Expected Results:**
- ✅ Detailed step-by-step logs
- ✅ Shows which strategies attempted
- ✅ Clear indication of success/failure
- ✅ Summary at the end
- ✅ No error messages

---

### Integration Test: Complete Scraping Workflow 🔄

**Test the complete scraping experience:**

1. **Navigate** to BizQuest.com
2. **Search** for a business listing
3. **Click** on a listing with visible financial data
4. **Open console** (F12) to monitor
5. **Click** extension icon
6. **Verify:**
   - Console shows platform detection
   - Data populates automatically
   - No errors in console
7. **Click** 🔍 debug icon
8. **Verify:**
   - Diagnostics show correct data
   - Status is "✅ Data Found"
   - Platform correctly identified
9. **Adjust** one of the scraped values manually
10. **Click** re-scrape in diagnostics
11. **Verify:**
    - Values reset to scraped data
    - Console shows new scraping attempt

**Expected Results:**
- ✅ Seamless experience start to finish
- ✅ All scraping features work together
- ✅ No console errors
- ✅ Diagnostics helpful for debugging

---

## Edge Cases to Test

### Scraping Edge Cases

1. **No Financial Data on Page:**
   - Go to homepage or search results
   - Open extension
   - Should handle gracefully (no errors)
   - Diagnostics should show "No Data Found"

2. **Partially Available Data:**
   - Find listing with price but no EBITDA
   - Should scrape price, leave EBITDA empty
   - No errors

3. **Multiple Dollar Amounts on Page:**
   - Listing with price, revenue, and EBITDA
   - Should find correct values
   - Check console logs to see decision-making

4. **Dynamically Loaded Content:**
   - Some sites load data via JavaScript
   - Extension should wait briefly
   - Use `waitForElement()` helper

5. **Login-Protected Data:**
   - Some sites hide financials unless logged in
   - Should gracefully show "Not found"
   - Diagnostics explain this in troubleshooting section

### Platform Edge Cases

1. **Unknown Platform:**
   - Visit an unlisted site with financial data
   - Should detect as "generic"
   - Generic scraper should still attempt to find data

2. **Subdomain Variations:**
   - www.bizquest.com vs bizquest.com
   - Should both detect correctly

---

## Previous Features (v1.4.0)

### Feature 1: Deal Quality Score ✅

**Test Steps:**
1. Open the extension on any business listing page
2. Enter test data:
   - EBITDA: $500,000
   - Asking Price: $2,000,000
3. Observe the Quality Score banner at the top
4. Adjust interest rate from 11.5% to 15%
   - Score should update in real-time
5. Adjust asking price from $2M to $1.5M
   - Score should improve (go up)
6. Adjust asking price to $5M
   - Score should get worse (go down, red badge)

**Expected Results:**
- Score displays 0-100
- Badge changes color: 🟢 🟡 🟠 🔴
- Text changes: "Excellent/Good/Fair/Weak Deal"
- Updates instantly as you type

---

### Feature 2: Settings Modal ⚙️

**Test Steps:**
1. Click the ⚙️ gear icon in header
2. Change "Target Cash-on-Cash Return" to 50%
3. Change "Target Payback Period" to 3 years
4. Check "Use compact number format"
5. Click "💾 Save Settings"
   - Should see "✅ Saved!" feedback
   - Modal should close after 1 second
6. Check that numbers now show as "1.2M" instead of "1,200,000"
7. Adjust asking price
   - Quality score should recalculate with new targets
8. Close extension, reopen it
   - Settings should persist
9. Open settings again, click "↺ Reset Defaults"
   - Should reset to 25% and 4 years

**Expected Results:**
- Modal opens/closes smoothly
- Settings save and persist
- Quality score respects new targets
- Compact format works throughout
- Reset button works

---

### Feature 3: Compact Number Format 📊

**Test Steps:**
1. Open settings, enable "Use compact number format"
2. Save settings
3. Enter large numbers:
   - EBITDA: $1,500,000
   - Asking: $5,000,000
4. Check all displayed numbers throughout UI
   - Should show "1.5M" and "5M" instead of full numbers

**Expected Results:**
- All currency displays use compact format
- Inputs still accept full numbers
- Format persists across sessions

---

### Feature 4: Save & Load Deals 💾

**Test Steps:**
1. Enter a complete deal analysis
2. In "Deal name" field, type "Test Coffee Shop"
3. Click "💾 Save" button
   - Should see "✅ Saved!" feedback
4. Enter different numbers (change EBITDA, asking price)
5. Open the "Load saved deal..." dropdown
   - Should see "Test Coffee Shop (date)" option
6. Select it from dropdown
   - All fields should restore to original values
7. Save again with same name
   - Should update, not create duplicate
8. Close extension, reopen it
9. Check dropdown - saved deal should still be there
10. Test keyboard shortcut Cmd/Ctrl + S
    - Should quick-save current deal

**Expected Results:**
- Deals save with all inputs
- Dropdown populates correctly
- Loading restores everything
- Updates work (no duplicates)
- Persists across sessions
- Keyboard shortcut works

---

### Feature 5: Deal Notes 📝

**Test Steps:**
1. Click in the "Add notes about this deal..." textarea
2. Type: "Check inventory levels. Ask about lease terms."
3. Wait 2 seconds (auto-save delay)
4. Close extension
5. Reopen extension
   - Notes should be preserved
6. Load a saved deal
   - Should load that deal's notes
7. Edit notes, save deal
   - Notes should save with deal

**Expected Results:**
- Notes persist automatically
- No manual save needed
- Notes tied to specific deals
- Textarea resizes properly

---

### Feature 6: Keyboard Shortcuts ⌨️

**Test Steps:**
1. With extension open, press **Cmd/Ctrl + E**
   - Extension should hide
2. Press **Cmd/Ctrl + E** again
   - Extension should show again
3. On a BizQuest listing, press **Cmd/Ctrl + R**
   - Should refresh/scrape data from page
   - EBITDA and Asking should populate
4. Make some changes, press **Cmd/Ctrl + S**
   - Should quick-save current deal
   - Check console for confirmation

**Expected Results:**
- Shortcuts work system-wide
- E toggles visibility
- R refreshes data (when on listing page)
- S saves deal
- Shortcuts only work when extension visible (except E)

---

### Integration Test: Complete Workflow 🔄

**Test the complete user journey:**

1. **Navigate** to: https://www.bizbuysell.com/
2. **Find** any business listing
3. **Press** Cmd/Ctrl + E to open extension
4. **Verify** data auto-scraped (EBITDA, Asking Price)
5. **Check** Quality Score appears
6. **Open** Settings (⚙️), set targets to 30% CoC, 5yr payback
7. **Enable** compact format
8. **Save** settings
9. **Type** deal name: "My First Deal"
10. **Add** notes: "Promising opportunity, need more DD"
11. **Adjust** interest rate to see quality score change
12. **Press** Cmd/Ctrl + S to save
13. **Visit** another listing
14. **Press** Cmd/Ctrl + E to open
15. **Select** "My First Deal" from dropdown
16. **Verify** everything loads correctly
17. **Export** as PDF
18. **Share** via email
19. **Press** Cmd/Ctrl + E to close

**Expected Results:**
- Smooth workflow start to finish
- All features work together
- No console errors
- Professional experience

---

## Edge Cases to Test

### Deal Name Edge Cases
- Empty name (should auto-generate)
- Very long name (should truncate?)
- Special characters in name
- Duplicate names (should update, not create new)

### Number Format Edge Cases
- Toggle format with existing data
- Very large numbers (10M+)
- Very small numbers (50K)
- Zero values
- Negative values

### Quality Score Edge Cases
- No data entered (should show "--")
- Asking > Max by 2x (should be red, score 0-20)
- Perfect deal: asking < max, CoC 50%+ (should be green, 90+)
- Missing EBITDA (score should handle gracefully)

### Storage Edge Cases
- Save 10+ deals (test dropdown scrolling)
- Very long notes (1000+ characters)
- Load deal from different page/site
- Clear browser data, reopen extension

---

## Known Limitations

1. **No Delete** - Can't delete saved deals yet (coming in v1.5)
2. **No Export Saved Deals** - Can't export deal library to CSV yet
3. **No Search** - Saved deals dropdown not searchable with many deals
4. **No Tags** - Can't categorize/filter deals yet

---

## Browser Compatibility

**Fully Tested:**
- ✅ Chrome 120+
- ✅ Edge 120+

**Should Work:**
- ⚠️ Brave (Chromium-based)
- ⚠️ Opera (Chromium-based)

**Not Supported:**
- ❌ Firefox (different extension API)
- ❌ Safari (different extension API)

---

## Performance Notes

- Extension should load in < 100ms
- Quality score updates should be instant (< 50ms)
- Auto-save debounced to 1 second (by design)
- No noticeable lag with 50+ saved deals

---

## Reporting Issues

If you find bugs, note:
1. Steps to reproduce
2. Expected vs actual behavior
3. Browser/version
4. Console errors (F12 > Console)
5. Screenshots if UI issue

