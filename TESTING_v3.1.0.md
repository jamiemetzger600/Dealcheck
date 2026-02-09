# Testing Guide: v3.1.0 - Instant Access to Real Business Listings

## 🎯 What Changed

This version removes OAuth complexity and provides instant access to real business listings on first launch.

### Key Changes:
1. **Opensheet API Integration** - Replaced Google Sheets API (OAuth) with free Opensheet API
2. **Default Data Source** - Pre-configured public spreadsheet with 100+ real business listings
3. **First Launch Auto-Fetch** - Automatically loads deals on first open (no manual setup)
4. **Zero Authentication** - No OAuth prompts, no permission dialogs
5. **Updated Documentation** - README reflects new instant-value experience

---

## 🧪 Testing Checklist

### Test 1: Fresh Install (First Launch Experience)

**Goal:** Verify that new users see real deals immediately without any setup.

**Steps:**
1. Remove any existing version of the extension from Chrome
2. Clear extension storage (optional but recommended):
   - Go to `chrome://extensions/`
   - Click "Remove" on old version
   - Go to `chrome://settings/content/all` and clear any extension data
3. Load the new v3.1.0 extension:
   - Extract ZIP
   - Load unpacked from `chrome://extensions/`
4. Click the extension icon to open dashboard
5. **EXPECTED RESULTS:**
   - Dashboard opens immediately
   - After ~1-2 seconds, you should see a welcome toast message:
     "Welcome! Loaded 100+ real business listings to get you started. Add your own sources anytime!"
   - Deal Aggregator tab shows 100+ real business listings
   - No OAuth prompts or authentication dialogs
   - Console shows: "🎉 First launch detected - auto-fetching real business listings..."

**What to Check:**
- [ ] Welcome toast appears
- [ ] 100+ deals visible in Deal Aggregator
- [ ] No authentication prompts
- [ ] Deals have real data (names, prices, locations, industries)
- [ ] Console shows successful Opensheet API fetch

---

### Test 2: Opensheet API Functionality

**Goal:** Verify that the Opensheet API correctly fetches and parses data.

**Steps:**
1. Open browser console (F12)
2. Click "🔄 Fetch Deals" button
3. Watch console output

**EXPECTED RESULTS:**
- Console shows: "🌐 Fetching Google Sheets via Opensheet API: Business Listings Database (100+ Real Deals)"
- Console shows: "✅ Fetched [number] rows from Opensheet API"
- Console shows: "✅ Parsed [number] deals from Opensheet JSON"
- No OAuth or authentication errors
- Deals appear in the dashboard

**What to Check:**
- [ ] Opensheet API URL is logged (should be: `https://opensheet.elk.sh/1RKab4UHut6SvVjjCtSeCGL0xT__WTLNwsACFRmSXYyM/1`)
- [ ] No 401 or 403 errors
- [ ] Deals have correct fields: name, price, location, industry, URL
- [ ] Deal details modal works when clicking on deals

---

### Test 3: Default Source Management

**Goal:** Verify that the default source is properly initialized and manageable.

**Steps:**
1. Click "📥 Manage Sources"
2. Look for "Business Listings Database (100+ Real Deals)" source

**EXPECTED RESULTS:**
- Default source is listed
- Source shows as "Enabled"
- Source type is "google_sheets"
- Last fetch timestamp is recent
- Deal count shows ~100+

**What to Check:**
- [ ] Default source appears in list
- [ ] Can disable/enable the default source
- [ ] Can remove the default source (if desired)
- [ ] Can add additional sources alongside default

---

### Test 4: Subsequent Launches

**Goal:** Verify that after first launch, the app doesn't re-fetch or show welcome message.

**Steps:**
1. Close the dashboard
2. Reopen the dashboard by clicking extension icon
3. Close and reopen 2-3 more times

**EXPECTED RESULTS:**
- Dashboard opens immediately with existing deals
- NO welcome toast message
- NO auto-fetch on subsequent opens
- Deals remain in storage
- Console does NOT show "🎉 First launch detected"

**What to Check:**
- [ ] No duplicate welcome messages
- [ ] Deals persist across sessions
- [ ] No unnecessary re-fetching
- [ ] Performance is fast

---

### Test 5: Adding Custom Sources

**Goal:** Verify that users can still add their own Google Sheets.

**Steps:**
1. Click "📥 Manage Sources"
2. Click "Add New Source"
3. Add a public Google Sheet:
   - Type: Google Sheets
   - Name: "My Test Sheet"
   - URL: [any public Google Sheet URL]
   - Sheet Name: "Sheet1" or "1"
4. Save and fetch

**EXPECTED RESULTS:**
- Custom source is added successfully
- Fetch works via Opensheet API
- Both default and custom sources appear in source list
- Deals from both sources are aggregated

**What to Check:**
- [ ] Can add custom Google Sheets
- [ ] Custom sheets must be public (private sheets will fail gracefully)
- [ ] Error message is clear if sheet is private or inaccessible
- [ ] Multiple sources work together

---

### Test 6: Buy Box Filtering

**Goal:** Verify that Buy Box still works with new data source.

**Steps:**
1. Click "⚙️ Configure Buy Box"
2. Set criteria:
   - Max Price: $500,000
   - Location: "California" or "Texas"
   - Industry: "Restaurant" or "E-commerce"
3. Save settings
4. Return to Deal Aggregator

**EXPECTED RESULTS:**
- Deals matching criteria show 🎯 badge
- Filtering works correctly
- Match scores are calculated

**What to Check:**
- [ ] Buy Box filtering works with Opensheet data
- [ ] Match badges appear correctly
- [ ] Can filter by "Buy Box Matches" only

---

### Test 7: Deal Details & Calculators

**Goal:** Verify that deal details and financial calculators work with new data.

**Steps:**
1. Click on any deal name to open detail modal
2. Review all deal fields
3. Use the "Max Price Calculator"
4. Use the "Target Offer Calculator"

**EXPECTED RESULTS:**
- All deal fields display correctly
- Financial calculators work
- Can save deal to "My Deals"
- Can hide deal

**What to Check:**
- [ ] Deal name, industry, location visible
- [ ] Asking price, revenue, EBITDA visible
- [ ] Broker info visible (if available)
- [ ] URL link works
- [ ] Calculators produce correct results

---

### Test 8: Error Handling

**Goal:** Verify graceful error handling if Opensheet API fails.

**Steps:**
1. Disconnect from internet (or use browser dev tools to block `opensheet.elk.sh`)
2. Click "🔄 Fetch Deals"

**EXPECTED RESULTS:**
- Error message appears in toast
- Console shows clear error message
- App doesn't crash
- Existing deals remain visible

**What to Check:**
- [ ] Error message is user-friendly
- [ ] Console shows technical details for debugging
- [ ] Can retry after reconnecting
- [ ] No data loss

---

## 🐛 Known Issues to Watch For

1. **Opensheet API Rate Limits**: If you fetch too frequently, Opensheet may throttle requests
2. **Private Sheets**: If user tries to add a private Google Sheet, it will fail (this is expected)
3. **Sheet Tab Names**: If sheet tab name is wrong, Opensheet returns 404
4. **First Launch Detection**: If storage isn't fully cleared, first launch logic may not trigger

---

## 📊 Success Metrics

- [ ] First launch takes < 5 seconds from click to seeing deals
- [ ] No authentication prompts or OAuth dialogs
- [ ] 100+ real business listings visible
- [ ] All existing features (Buy Box, calculators, My Deals) work correctly
- [ ] Error messages are clear and actionable
- [ ] Performance is fast (no lag when scrolling deals)

---

## 🔍 Console Debugging

**Key Console Messages to Look For:**

**First Launch:**
```
🔍 Checking for first launch...
🚀 First launch detected - initializing default deal source...
✅ Default deal source initialized with real business listings
🎉 First launch detected - auto-fetching real business listings...
🌐 Fetching Google Sheets via Opensheet API: Business Listings Database (100+ Real Deals)
✅ Fetched [N] rows from Opensheet API
✅ Parsed [N] deals from Opensheet JSON
```

**Subsequent Launches:**
```
🔍 Checking for first launch...
✅ Default source already initialized
```

**Manual Fetch:**
```
🔄 Fetching deals from Google Sheets only...
🌐 Fetching Google Sheets via Opensheet API: [Source Name]
✅ Fetched [N] rows from Opensheet API
📥 Fetched [N] deals from Google Sheets
```

---

## 📝 Feedback to Provide

After testing, please report:

1. **What worked well:**
   - First launch experience
   - Data quality
   - Performance

2. **What didn't work:**
   - Any errors or crashes
   - Missing or incorrect data
   - Confusing UI/UX

3. **Suggestions:**
   - What would make this better?
   - Any features missing?
   - Documentation improvements?

---

## 🚀 Version Info

- **Version:** 3.1.0
- **Branch:** spreadsheet-parser
- **Date:** February 9, 2026
- **Key Feature:** Instant access to real business listings via Opensheet API

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors (F12)
2. Try reloading the extension
3. Clear extension storage and reinstall
4. Report issues with console logs and screenshots
