# Development Plan - Next Steps (v2.1.6+)

## Current Status: v2.1.5
✅ Fixed global action buttons  
✅ Phase 1 Complete: Deal Aggregator foundation (RSS feeds, table, search, pagination)  
✅ Google Sheets integration working  
✅ Custom source manager implemented  

## 🎯 NEXT: Continue Building Deal Aggregator (Phase 2)

Based on our Phase 1 completion and the improvements document, here's what to build next:

---

## Priority 1: Core Functionality Gaps (Essential)

### 1. Make Deal Aggregation Actually Work 🔴 CRITICAL
**Status:** Functions exist but aren't fully operational  
**Problem:** The "Fetch Deals" button is set up but aggregation may not be fully working

**Tasks:**
- [ ] Test if RSS parsing is actually fetching deals
- [ ] Verify custom source fetching works
- [ ] Ensure deals populate the aggregator table
- [ ] Fix any console errors blocking aggregation
- [ ] Add better error messages if sources fail

**Estimated Time:** 2-3 hours

---

### 2. Implement "Save Deal" Functionality
**Status:** Button exists in aggregator table, but may not save to "My Deals"  
**Problem:** No clear flow from aggregated deals → saved deals

**Tasks:**
- [ ] Verify "Save" button in aggregator table works
- [ ] Convert aggregated deal format to "My Deals" format
- [ ] Add deal to saved deals storage
- [ ] Update "My Deals" count badge
- [ ] Show success toast
- [ ] Prevent duplicate saves

**Estimated Time:** 1-2 hours

---

### 3. Make "My Deals" Tab Functional
**Status:** Tab exists but may be empty/non-functional  
**Problem:** Users can't see or manage their saved deals in the new dashboard

**Tasks:**
- [ ] Load saved deals into "My Deals" tab
- [ ] Display deals in table format (reuse existing dashboard table)
- [ ] Add status filters (Hot/Warm/Cold/Pass)
- [ ] Add search functionality
- [ ] Add delete functionality
- [ ] Add export to CSV
- [ ] Add "Analyze" button to open deal in calculator

**Estimated Time:** 3-4 hours

---

## Priority 2: Source Management & Data Quality

### 4. Enhance Source Management Modal
**Status:** Basic modal exists, needs full implementation

**Tasks:**
- [ ] Show list of active sources
- [ ] Display deal count per source
- [ ] Add enable/disable toggles
- [ ] Add "Test Source" button to verify before adding
- [ ] Add delete source functionality
- [ ] Add edit source functionality
- [ ] Show last fetched timestamp

**Estimated Time:** 2-3 hours

---

### 5. Implement Manual Deal Entry
**Status:** Modal exists, needs functionality

**Tasks:**
- [ ] Create form for manual deal entry
- [ ] Fields: Name, URL, Price, EBITDA, Location, Industry, Description
- [ ] Add to aggregated pool
- [ ] Show success message
- [ ] Clear form after save
- [ ] Validate required fields

**Estimated Time:** 1-2 hours

---

## Priority 3: Buy Box Filtering (Phase 3 Preparation)

### 6. Configure Buy Box Modal
**Status:** Button shows "coming soon"  
**Goal:** Allow users to set deal criteria filters

**Tasks:**
- [ ] Create buy box configuration modal
- [ ] Fields:
  - Min/Max Price Range
  - Min/Max EBITDA
  - Target Industries (multi-select)
  - Target Locations (multi-select)
  - Min Quality Score
- [ ] Save buy box settings
- [ ] Apply filters to aggregator table
- [ ] Show "Matches Buy Box" badge on qualifying deals
- [ ] Update stats to show "X deals match buy box"

**Estimated Time:** 3-4 hours

---

## Priority 4: Polish & User Experience

### 7. Error Handling & Validation
**Tasks:**
- [ ] Add try-catch around all storage operations
- [ ] Validate deal data structures
- [ ] Show user-friendly error messages
- [ ] Handle network errors gracefully
- [ ] Add retry logic for failed fetches

**Estimated Time:** 2 hours

---

### 8. Loading States & Feedback
**Tasks:**
- [ ] Add spinners to buttons during operations
- [ ] Show loading skeleton while fetching deals
- [ ] Improve toast notifications
- [ ] Add progress indicators for bulk operations
- [ ] Better empty states

**Estimated Time:** 1-2 hours

---

## Priority 5: Advanced Features (Later)

### 9. Duplicate Detection
- Smart deduplication across sources
- Flag potential duplicates
- Allow user to merge/keep

### 10. Scheduled Aggregation
- Auto-fetch deals daily
- Background sync
- Notification for new deals matching buy box

### 11. Deal Comparison View
- Side-by-side comparison of 2-3 deals
- Highlight differences
- Export comparison report

---

## Recommended Build Order (This Session)

**Start Here - Test Current State:**
1. Load extension and test current functionality
2. Identify what's actually working vs broken
3. Fix critical bugs first

**Then Build (In Order):**
1. **Fix Deal Aggregation** (if broken) - CRITICAL
2. **Implement "Save Deal"** - Users need to save deals they like
3. **Make "My Deals" Tab Work** - Users need to manage saved deals
4. **Manual Deal Entry** - Quick win, useful feature
5. **Enhance Source Management** - Improve existing feature
6. **Buy Box Configuration** - Differentiated feature, high value

---

## Success Criteria

After completing Priority 1-3, users should be able to:
- ✅ Fetch deals from multiple sources (RSS + custom)
- ✅ Browse deals in aggregator table
- ✅ Save interesting deals to "My Deals"
- ✅ Manage their saved deals (view, search, filter, delete)
- ✅ Add deals manually
- ✅ Manage their sources (add, remove, test)
- ✅ Configure buy box criteria
- ✅ See which deals match their criteria

---

## Notes

- Current version: v2.1.5
- Branch: feature/deal-aggregator-v2
- All changes should increment version (v2.1.6, v2.1.7, etc.)
- Test each feature before moving to next
- Commit frequently with descriptive messages
- Update release notes for each version

---

## What to Build RIGHT NOW

**Let's start with: Testing & Fixing Core Aggregation**

I'll:
1. Test if "Fetch Deals" actually works
2. Fix any issues with RSS parsing
3. Verify deals populate the table
4. Then move to "Save Deal" functionality
