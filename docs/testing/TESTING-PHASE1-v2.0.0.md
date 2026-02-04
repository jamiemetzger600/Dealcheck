# Phase 1 Testing Guide - v2.0.0

## Testing Checklist

### 1. Journey Indicator
- [ ] Open `deals-dashboard.html` in Chrome
- [ ] Verify 5-stage journey indicator displays: DATA → INFORMATION → KNOWLEDGE → INSIGHT → WISDOM
- [ ] Verify DATA stage is highlighted (active)
- [ ] Click between tabs and verify stage updates
  - Deal Aggregator tab → DATA stage active
  - My Deals tab → WISDOM stage active

### 2. Tab Navigation
- [ ] Verify two tabs visible: "Deal Aggregator" and "My Deals"
- [ ] Click "Deal Aggregator" tab
  - Tab highlighted
  - Aggregator content visible
  - Badge shows "0" initially
- [ ] Click "My Deals" tab
  - Tab highlighted
  - My Deals content visible (existing dashboard)
  - Badge shows saved deals count

### 3. RSS Feed Aggregation
- [ ] Click "Start Aggregating Deals" button
- [ ] Verify toast notification appears: "Starting deal aggregation..."
- [ ] Button shows loading state
- [ ] After fetch completes, verify toast: "✅ Added X new deals"
- [ ] Stats update:
  - Total Deals count
  - Added Today count
  - Active Sources count (should be 2: Nationwide + BizWorldUSA)

### 4. Table Display
- [ ] After aggregation, empty state disappears
- [ ] Table appears with columns:
  - NAME
  - ASKING
  - EBITDA
  - LOCATION
  - INDUSTRY
  - SOURCE
  - DISCOVERED
  - ACTIONS
- [ ] Verify deals display in rows
- [ ] Hover over row → background changes (tertiary color)

### 5. Sorting
- [ ] Click "NAME" column header
  - Deals sort A-Z
  - Arrow shows ↑
- [ ] Click "NAME" again
  - Deals sort Z-A
  - Arrow shows ↓
- [ ] Test other columns:
  - ASKING (by price)
  - EBITDA (by EBITDA)
  - LOCATION (alphabetically)
  - INDUSTRY (alphabetically)
  - DISCOVERED (by date)

### 6. Search
- [ ] Type in search box: "restaurant"
- [ ] Verify table filters to matching deals
- [ ] Clear search
- [ ] Verify all deals reappear
- [ ] Test search on:
  - Deal names
  - Locations
  - Industries

### 7. Pagination
- [ ] If >50 deals, verify pagination appears
- [ ] "Previous" button disabled on page 1
- [ ] Click "Next" button → Page 2 loads
- [ ] Verify "Showing X-Y of Z deals" updates
- [ ] Navigate through pages

### 8. Actions
- [ ] Click 💾 (Save) button on a deal
- [ ] Verify toast: "✅ Deal saved to My Deals!"
- [ ] Switch to "My Deals" tab
- [ ] Verify deal appears in saved deals
- [ ] Badge count updates

### 9. Configure Buy Box
- [ ] Click "⚙️ Configure Buy Box" button
- [ ] Verify toast: "Buy Box configuration coming in Phase 3!"
- [ ] Journey indicator updates to INFORMATION stage

### 10. Storage
- [ ] Open DevTools → Application → Storage → Local Storage
- [ ] Verify keys exist:
  - `aggregatedDealsPool`
  - `savedDeals` (after saving)
  - `lastSyncTimestamp`
- [ ] Check data structure is valid JSON

### 11. Dark Mode
- [ ] Extension respects existing dark mode setting
- [ ] All new components use dark theme colors
- [ ] Text readable on dark backgrounds
- [ ] Hover states visible

### 12. Performance
- [ ] Aggregation completes within 5-10 seconds
- [ ] Table renders smoothly with 100+ deals
- [ ] Search responds quickly (<300ms)
- [ ] Sorting is instant
- [ ] No console errors

## Expected Data Format

### Aggregated Deal:
```json
{
  "id": "rss_abc123",
  "name": "Healthcare SaaS Platform",
  "url": "https://example.com/listing",
  "description": "Well-established SaaS platform...",
  "source": "Nationwide Businesses (UK)",
  "sourceType": "rss",
  "discoveredAt": 1706140800000,
  "askingPrice": 2800000,
  "ebitda": 720000,
  "location": "Dallas, TX",
  "city": "Dallas",
  "state": "TX",
  "industry": "Healthcare"
}
```

## Known Limitations (Phase 1)

- RSS feeds may be blocked by CORS (test with local server or extension)
- Buy Box filtering not yet implemented (Phase 3)
- Deal details modal not yet implemented (Phase 4)
- AI scoring not yet implemented (Phase 4)
- Duplicate detection basic (exact URL match only)

## Next Steps (Phase 2)

- Add 5+ new scrapers (BizBen, BizMLS, DealStream, GlobalBX, Hedgestone)
- Expand to 10K+ aggregated deals
- Background auto-sync with chrome.alarms
- Enhanced duplicate detection

## Test Results

Date: _____________
Tester: _____________

**Pass/Fail Summary:**
- Journey Indicator: ⬜ Pass ⬜ Fail
- Tab Navigation: ⬜ Pass ⬜ Fail
- RSS Aggregation: ⬜ Pass ⬜ Fail
- Table Display: ⬜ Pass ⬜ Fail
- Sorting: ⬜ Pass ⬜ Fail
- Search: ⬜ Pass ⬜ Fail
- Pagination: ⬜ Pass ⬜ Fail
- Actions: ⬜ Pass ⬜ Fail
- Storage: ⬜ Pass ⬜ Fail
- Dark Mode: ⬜ Pass ⬜ Fail
- Performance: ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________________________
_______________________________________________________
_______________________________________________________
