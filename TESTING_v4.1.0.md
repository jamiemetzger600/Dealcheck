# Testing Guide - My Deals Harmonization v4.1.0

## Pre-Testing Setup

### 1. Start the Backend
```bash
cd backend
npm start
# Backend will auto-run the status migration
# Look for: "✓ Migration: harmonize_deal_statuses"
```

### 2. Start the Web App
```bash
cd web
npm run dev
# Should open at http://localhost:3000
```

### 3. Login and Navigate
- Login with your test account
- Click the "My Deals" tab in the navigation

## Visual Verification

### Stats Row (Top)
You should see 4 cards:
- [ ] **Total Deals** - Shows count of all saved deals
- [ ] **🔥 Hot Leads** - Red left border
- [ ] **🌡️ Warm** - Orange left border  
- [ ] **❄️ Cold** - Blue left border

### Controls Row
- [ ] Search box with 🔍 icon on the left
- [ ] Status filter dropdown (All Statuses, Hot, Warm, Cold, Pass, No Status)
- [ ] Sort dropdown (Newest First, Oldest First, Name A-Z, etc.)
- [ ] "📤 Export CSV" button
- [ ] "↻ Refresh" button

### Table
Headers should be:
- [ ] Checkbox (select all)
- [ ] Deal Name (sortable)
- [ ] Saved Date (sortable)
- [ ] Status
- [ ] Asking Price (sortable)
- [ ] EBITDA (sortable)
- [ ] Quality
- [ ] COC Return
- [ ] Actions

## Functional Testing

### Search
1. [ ] Type in search box
2. [ ] Table filters to show matching deals
3. [ ] Clear search
4. [ ] All deals return

### Status Filter
1. [ ] Select "Hot" from dropdown
2. [ ] Only hot deals show
3. [ ] Select "All Statuses"
4. [ ] All deals return

### Sorting
1. [ ] Click "Deal Name" header
2. [ ] Deals sort alphabetically
3. [ ] Click again
4. [ ] Reverse alphabetical
5. [ ] Or use sort dropdown

### Selection
1. [ ] Click checkbox on one deal
2. [ ] Row highlights with blue background
3. [ ] Bulk actions bar appears below controls
4. [ ] Shows "1 deal selected"
5. [ ] Check "Select All" checkbox
6. [ ] All visible deals selected
7. [ ] Bulk actions shows "N deals selected"

### Bulk Export
1. [ ] Select 2-3 deals
2. [ ] Click "📤 Export Selected"
3. [ ] CSV file downloads
4. [ ] Open CSV - verify selected deals are included
5. [ ] Click "📤 Export CSV" (top button)
6. [ ] All filtered deals export

### Bulk Delete
1. [ ] Select 1 deal (use a test deal)
2. [ ] Click "🗑️ Delete Selected"
3. [ ] Confirmation dialog appears
4. [ ] Click OK
5. [ ] Deal is removed
6. [ ] Stats update correctly

### Deal Modal - Open
1. [ ] Click anywhere on a deal row (not checkbox)
2. [ ] Modal opens full screen
3. [ ] Deal name shows in header
4. [ ] × close button on top right

### Deal Modal - Status
1. [ ] Status dropdown shows current status
2. [ ] Change to "Hot" (🔥 Hot)
3. [ ] Page auto-saves (no delay)
4. [ ] Close modal
5. [ ] Table shows updated status badge
6. [ ] Stats update (Hot count increases)

### Deal Modal - Notes
1. [ ] Open a deal
2. [ ] Type in Notes textarea
3. [ ] Wait 1 second
4. [ ] Message: "Notes are auto-saved as you type"
5. [ ] Close modal
6. [ ] Reopen same deal
7. [ ] Notes are persisted

### Deal Modal - Actions
1. [ ] Click "View Original Listing →"
2. [ ] Opens deal URL in new tab (if deal has URL)
3. [ ] Click "📤 Share"
4. [ ] Native share dialog appears (mobile) or clipboard copy confirmation
5. [ ] Click "📊 Export CSV"
6. [ ] Single deal CSV downloads
7. [ ] Click "🗑️ Delete"
8. [ ] Confirmation dialog
9. [ ] Click OK
10. [ ] Modal closes, deal removed from table

### Deal Modal - Broker Info
1. [ ] Scroll to "👔 Broker Information" section
2. [ ] Fill in:
   - Broker Name: "John Smith"
   - Company: "ABC Brokers"
   - Phone: "(555) 123-4567"
   - Email: "john@abcbrokers.com"
3. [ ] Click "💾 Save Broker Info"
4. [ ] Success alert appears
5. [ ] Close modal and reopen
6. [ ] Broker info persists

### Deal Modal - Progress Tracking
1. [ ] Scroll to "📋 Deal Progress Tracking" section
2. [ ] Select "Requested NDA" from dropdown
3. [ ] Click "+ Add Progress Update"
4. [ ] Progress appears in history with timestamp
5. [ ] Add another: "Signed NDA"
6. [ ] Both updates show in chronological order
7. [ ] Close modal and reopen
8. [ ] Progress history persists

### Deal Modal - Calculator Info
1. [ ] Scroll to "🎯 Deal Structure Calculator" section
2. [ ] Click "▶ Show Calculator"
3. [ ] Info message appears explaining to use Deal Aggregator
4. [ ] Message is clear and helpful
5. [ ] Click "▼ Hide Calculator"
6. [ ] Section collapses

### Empty States
1. [ ] If no deals saved:
   - [ ] Shows 📭 icon
   - [ ] "No deals saved yet"
   - [ ] "Save deals from the Deal Aggregator to get started!"
2. [ ] With deals, type gibberish in search:
   - [ ] Shows 🔍 icon
   - [ ] "No deals match your filters"
   - [ ] "Try adjusting your search or filters."

## Status Badge Verification

Open deals with different statuses and verify colors:
- [ ] Hot: Red background (#e74c3c with opacity)
- [ ] Warm: Orange background (#f39c12 with opacity)
- [ ] Cold: Blue background (#3498db with opacity)
- [ ] Pass: Gray background (#95a5a6 with opacity)
- [ ] No Status: Dark gray background

## Mobile Testing (if available)

### Resize browser to mobile width (< 768px)
- [ ] Stats show 2 columns (not 4)
- [ ] Search and filters stack vertically
- [ ] Table scrolls horizontally
- [ ] Modal is full screen (no border radius)
- [ ] Buttons in modal footer wrap to 2 rows

## Data Migration Testing

If you have deals with old statuses:
- [ ] Deals with status "new" show as "No Status" (—)
- [ ] Deals with status "passed" show as "Pass" (❌)
- [ ] No errors in browser console
- [ ] No errors in backend logs

## Integration Testing

### Save a new deal from Deal Aggregator
1. [ ] Go to Deal Aggregator tab
2. [ ] Click heart/save button on a deal
3. [ ] Switch to My Deals tab
4. [ ] New deal appears in table
5. [ ] Stats update (Total increases)
6. [ ] Default status is "No Status"

### Update deal and verify persistence
1. [ ] Change status to "Hot"
2. [ ] Add notes "Test notes"
3. [ ] Refresh browser (F5)
4. [ ] Go to My Deals
5. [ ] Deal still shows "Hot" status
6. [ ] Notes still present

## Performance Check

With 50+ deals (if available):
- [ ] Table loads quickly (< 1 second)
- [ ] Search filters instantly (< 100ms)
- [ ] Sort is instant
- [ ] Modal opens without lag
- [ ] No console errors

## Browser Console Check

Throughout testing:
- [ ] No JavaScript errors
- [ ] No React warnings
- [ ] No 404s or network errors
- [ ] API calls succeed (200 status)

## Pass Criteria

To consider testing complete:
- All checkboxes above are ✓
- No critical bugs found
- UI matches extension design
- All features work as expected
- Mobile responsive works

## Common Issues and Fixes

### "Deals not loading"
- Check backend is running
- Verify JWT token in localStorage
- Check browser console for errors

### "Status not saving"
- Check backend logs for errors
- Verify API endpoint is reachable
- Check network tab for failed requests

### "Layout looks broken"
- Hard refresh (Cmd+Shift+R / Ctrl+F5)
- Clear browser cache
- Verify CSS file loaded (check Network tab)

### "Modal not closing"
- Check for JavaScript errors
- Try ESC key
- Refresh page if stuck

## Report Issues

If you find issues:
1. Note the exact steps to reproduce
2. Check browser console for errors
3. Check backend logs
4. Take screenshot if UI issue
5. Document expected vs actual behavior
