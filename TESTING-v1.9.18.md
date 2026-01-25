# Deal Progress Tracking - Testing Guide v1.9.18

## Overview
This testing guide covers the new deal progress tracking features including automated broker information scraping and manual editing capabilities.

---

## Test 1: Automated Broker Information Scraping

### Objective
Verify that broker information is automatically scraped from listing pages when saving deals.

### Test Steps

1. **Navigate to a business listing** on a supported platform:
   - BizBuySell
   - BizQuest
   - Crexi
   - LoopNet
   - Other listing platforms

2. **Open the Deal Analyzer extension**
   - Click the extension icon or use keyboard shortcut

3. **Verify automatic data population**
   - Check that EBITDA and Asking Price are populated
   - Look at console logs (F12) for broker scraping messages
   - Should see: `👔 Broker info scraped: {...}`

4. **Save the deal**
   - Enter a deal name
   - Click save button (💾) or press Cmd/Ctrl+S
   - Verify "✅ Saved!" feedback appears

5. **Open Deals Dashboard**
   - Click the dashboard icon (📊)
   - Find the saved deal in the list
   - Click on the deal name to open details

6. **Verify Broker Information Section**
   - Navigate to "👔 Broker Information" section
   - Check if fields are pre-populated with scraped data:
     - Broker Name
     - Company
     - Phone Number
     - Email

### Expected Results

✅ **Pass Criteria:**
- Broker information fields show scraped data (if available on page)
- At least email or phone number is captured from most listings
- Company names with LLC/Inc/Corp are detected
- Fields are editable even when pre-populated
- Empty fields when no broker info found on page

❌ **Fail Criteria:**
- Extension crashes when scraping
- Broker fields show "undefined" or errors
- Cannot edit pre-populated fields
- Wrong information captured (e.g., prices in name field)

---

## Test 2: Manual Broker Information Editing

### Objective
Ensure users can manually enter or modify broker information regardless of scraping results.

### Test Steps

1. **Open any saved deal** in the dashboard
2. **Navigate to Broker Information section**
3. **Test empty field entry:**
   - Clear all broker fields
   - Enter new information:
     - Name: "John Smith"
     - Company: "Acme Brokers LLC"
     - Phone: "(555) 123-4567"
     - Email: "john@acmebrokers.com"
   - Click "💾 Save Broker Info"
   - Verify success toast notification appears

4. **Test field modification:**
   - Edit existing broker name
   - Change company name
   - Update phone number format
   - Modify email address
   - Save changes

5. **Verify persistence:**
   - Close the deal modal
   - Reopen the same deal
   - Confirm all changes were saved correctly

6. **Test special characters:**
   - Enter phone: "+1 (555) 123-4567 ext. 123"
   - Enter email with dots: "john.smith@acme-brokers.com"
   - Enter company with special chars: "ABC & Associates, Inc."
   - Verify all save correctly

### Expected Results

✅ **Pass Criteria:**
- All fields are fully editable
- Changes save immediately on button click
- Success toast appears after save
- Data persists across sessions
- Special characters handled correctly
- No character limits interfering with normal use

---

## Test 3: Deal Progress Tracking

### Objective
Test the complete progress tracking workflow including built-in and custom statuses.

### Test Steps

1. **Open a saved deal**
2. **Navigate to "📋 Deal Progress Tracking" section**

3. **Test built-in status selection:**
   - Click the "Current Progress Status" dropdown
   - Verify all 13 built-in statuses appear:
     - Requested NDA
     - Signed NDA
     - Deal Room Access
     - Underwriting Began
     - Underwriting Complete
     - Bank Pre-Approval
     - IOI Sent/Accepted/Declined
     - LOI Sent/Accepted/Declined
     - Awaiting Seller Response
   - Select "Requested NDA"
   - Verify item immediately appears in Progress History
   - Check timestamp is accurate

4. **Test progress history display:**
   - Add multiple status updates
   - Verify chronological order (newest first)
   - Check each item shows:
     - 📌 Icon
     - Status text
     - Date and time
     - Delete button (×)

5. **Test custom status creation:**
   - Enter "Initial Discovery Call" in custom status field
   - Click "+ Add" button
   - Verify success toast
   - Check custom status appears in dropdown
   - Select and add the custom status
   - Verify it appears in history

6. **Test progress item deletion:**
   - Hover over any progress item
   - Click the × button
   - Verify item is removed immediately
   - Confirm "Progress item removed" toast appears

7. **Test multiple deals:**
   - Create custom status in Deal A
   - Switch to Deal B
   - Verify Deal A's custom status NOT in Deal B's dropdown
   - (Custom statuses are deal-specific)

### Expected Results

✅ **Pass Criteria:**
- Dropdown shows all built-in statuses
- Progress updates save instantly without extra clicks
- History shows in chronological order
- Timestamps are accurate
- Delete functionality works
- Custom statuses persist per deal
- Scrollbar appears if history is long
- Success notifications for all actions

---

## Test 4: CSV Export with Broker & Progress Data

### Objective
Verify that exported CSV files include complete broker and progress information.

### Test Steps

1. **Prepare test data:**
   - Create/open a deal with:
     - Complete broker information
     - Multiple progress status updates
     - Notes

2. **Export single deal:**
   - In dashboard, click "📤 Export" button on deal row
   - OR open deal modal and click modal export button

3. **Verify CSV contents:**
   - Open exported CSV file
   - Check for columns:
     - Broker Name
     - Broker Company
     - Broker Phone
     - Broker Email
     - Latest Progress
   - Verify data matches dashboard

4. **Export multiple deals:**
   - Select 2-3 deals using checkboxes
   - Click "📤 Export Selected" in bulk actions
   - Verify all deals included
   - Check broker and progress data for each

5. **Export with filter:**
   - Apply status filter (e.g., "Hot")
   - Click main "📤 Export" button
   - Verify only filtered deals exported
   - Confirm broker/progress data included

### Expected Results

✅ **Pass Criteria:**
- CSV includes new broker columns
- Latest progress status shown (most recent)
- Phone numbers maintain formatting
- Email addresses export correctly
- Company names with special characters export properly
- Excel/Google Sheets can open file without errors

---

## Test 5: Data Persistence & Edge Cases

### Objective
Test data integrity across various scenarios and edge cases.

### Test Steps

1. **Test browser session:**
   - Add broker info and progress
   - Close browser completely
   - Reopen browser and extension
   - Verify all data intact

2. **Test empty states:**
   - Open deal with no broker info
   - Verify placeholder text shows in fields
   - Add one field only (e.g., just email)
   - Save and verify

3. **Test long text:**
   - Enter very long company name (100+ chars)
   - Enter long custom status name
   - Verify UI doesn't break
   - Check save/load works

4. **Test special characters:**
   - Email: `test+filter@sub-domain.co.uk`
   - Phone: `+44 20 7123 4567`
   - Name: `O'Brien-Smith, Jr.`
   - Custom status: `Awaiting Financials (Q1 2024)`
   - Verify all handle correctly

5. **Test rapid interactions:**
   - Quickly add 10 progress status updates
   - Rapidly switch between dropdown options
   - Verify no UI lag or errors
   - Check all saved correctly

6. **Test concurrent edits:**
   - Open same deal in two dashboard tabs
   - Edit broker info in Tab 1
   - Edit progress in Tab 2
   - Verify no data loss or corruption

### Expected Results

✅ **Pass Criteria:**
- All data survives browser restart
- Empty states show gracefully
- Long text truncates or scrolls appropriately
- Special characters don't cause errors
- No performance issues with rapid input
- Multiple tabs don't corrupt data

---

## Test 6: Dark Mode Compatibility

### Objective
Ensure all new UI elements work correctly in dark mode.

### Test Steps

1. **Enable dark mode:**
   - Click settings icon (⚙️)
   - Toggle dark mode on

2. **Test broker section:**
   - Open deal modal
   - Check broker information section
   - Verify:
     - Input fields have dark background
     - Text is readable (light on dark)
     - Borders are visible
     - Save button has good contrast

3. **Test progress tracking:**
   - Check progress dropdown styling
   - Verify progress history items:
     - Background colors appropriate
     - Text readable
     - Hover effects work
     - Delete button visible

4. **Toggle mode:**
   - Switch between light/dark modes
   - Verify smooth transitions
   - Check no visual glitches

### Expected Results

✅ **Pass Criteria:**
- All text readable in dark mode
- Inputs have appropriate dark styling
- Borders and separators visible
- Hover effects work in both modes
- No white flashes when switching modes
- Icons and emojis display correctly

---

## Test 7: Backward Compatibility

### Objective
Ensure deals saved with older versions still work correctly.

### Test Steps

1. **Load old deals:**
   - If you have deals from v1.9.17 or earlier
   - Open deals dashboard
   - Open an old deal

2. **Verify graceful degradation:**
   - Broker section should show empty fields (not errors)
   - Progress section should show "No progress updates yet"
   - All other deal data intact

3. **Add new data to old deal:**
   - Add broker information
   - Add progress status
   - Save
   - Verify deal now has new features

4. **Export old deal:**
   - Export deal that was created before v1.9.18
   - Check CSV has new columns (may be empty)
   - Verify no export errors

### Expected Results

✅ **Pass Criteria:**
- Old deals load without errors
- Missing fields default to empty/appropriate states
- Can add new tracking data to old deals
- No data loss from existing fields
- Export works for all deals regardless of version

---

## Regression Testing Checklist

Ensure new features didn't break existing functionality:

- [ ] Extension still loads on listing pages
- [ ] EBITDA and Asking Price scraping still works
- [ ] Deal quality score calculates correctly
- [ ] Calculator functions (all scenarios)
- [ ] Save deal basic functionality
- [ ] Dashboard filtering and sorting
- [ ] Bulk operations (delete, export)
- [ ] Status dropdown (Hot/Warm/Cold/Pass)
- [ ] Notes field saves correctly
- [ ] URL links work in dashboard
- [ ] Dark mode toggle
- [ ] Settings persistence

---

## Bug Reporting Template

If you find issues during testing, report using this format:

```
**Bug Title:** [Brief description]

**Version:** v1.9.18

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Screenshot/Console Errors:**
[Attach if available]

**Browser/OS:**
[e.g., Chrome 120 on macOS 14]

**Deal Data:**
[If relevant, describe the deal being tested]
```

---

## Success Criteria Summary

**Test 1 (Scraping):** 80%+ pass rate across 10 different listings  
**Test 2 (Manual Edit):** 100% pass - all fields must be editable  
**Test 3 (Progress):** 100% pass - core workflow must work  
**Test 4 (Export):** 100% pass - data integrity critical  
**Test 5 (Persistence):** 95%+ pass - allow minor edge cases  
**Test 6 (Dark Mode):** 100% pass - accessibility requirement  
**Test 7 (Compatibility):** 100% pass - no breaking changes  

---

## Performance Benchmarks

- **Broker scraping:** < 100ms additional load time
- **Save deal:** < 500ms total
- **Open deal modal:** < 200ms with full data
- **Progress list render:** < 50ms for 50 items
- **Export CSV:** < 1s for 100 deals

---

## Browser Testing Matrix

Test on multiple browsers:
- [ ] Chrome (latest)
- [ ] Chrome (one version back)
- [ ] Edge (latest)
- [ ] Brave (latest)
- [ ] Opera (latest)

---

## Platform Testing Matrix

Test scraping on all supported platforms:
- [ ] BizBuySell
- [ ] BizQuest
- [ ] Crexi
- [ ] LoopNet
- [ ] Zillow (commercial)
- [ ] Redfin (commercial)
- [ ] Generic listings

---

## Notes

- Some listing platforms may not have broker information publicly visible
- Phone/email scraping depends on page structure; not all sites expose this data
- Custom statuses are intentionally deal-specific to allow flexible workflows
- Broker information scraping improves over time as we add more platform-specific selectors
