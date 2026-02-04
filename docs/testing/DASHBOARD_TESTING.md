# Deals Dashboard - Testing Guide

## Quick Test Checklist

### ✅ Basic Functionality
- [ x] Dashboard opens from extension icon
- [x ] Deals load and display correctly
- [x ] Statistics cards show correct counts
- [ x] Empty state shows when no deals exist

### ✅ Search & Filter
- [x ] Search filters deals in real-time (with 300ms debounce)
- [x ] Status filter works (Hot/Warm/Cold/Pass/None)
- [x ] Search works with deal names
- [x ] Search works with URLs
- [ *] Search works with notes
- [ x] Combined search + status filter works

### ✅ Sorting
- [x ] Sort by date (newest/oldest)
- [x ] Sort by name (A-Z/Z-A)
- [x ] Sort by price (highest/lowest)
- [ x] Sort by quality score (best/worst)
- [x ] Sorting persists after filter changes

### ✅ Status Management
- [ ] Change status via dropdown
- [ ] Status persists after refresh
- [ ] Toast notification appears on status change
- [ ] Statistics update when status changes

### ✅ Selection & Bulk Actions
- [ x] Select individual deals
- [x ] Select all checkbox works
- [ ] Select all shows indeterminate state when partial
- [ x] Bulk actions bar appears when deals selected
- [ x] Deselect all works
- [ ] Selection persists during filtering

### ✅ Delete Operations
- [x ] Delete single deal (with confirmation)
- [ x] Delete shows toast notification
- [ ] Bulk delete works (with confirmation)
- [ ] Bulk delete shows toast notification
- [ ] Deleted deals don't reappear after refresh

### ✅ Export Operations
- [ ] Export single deal downloads CSV
- [ ] Export selected deals downloads CSV
- [ ] Export all visible deals downloads CSV
- [ ] CSV contains all expected columns
- [ ] CSV handles special characters correctly
- [ ] Toast notification appears on export
- [ ] Export works with filtered deals

### ✅ Error Handling
- [ ] Invalid deals are filtered out on load
- [ ] Warning toast appears for invalid deals
- [ ] Storage errors show error toast
- [ ] Export errors show error toast
- [ ] Dashboard handles corrupted data gracefully

### ✅ UI/UX
- [ ] Dark mode works correctly
- [ ] Toast notifications appear and disappear
- [ ] Loading spinner shows during initial load
- [ ] Refresh button shows loading state
- [ ] Search is debounced (no lag while typing)
- [ ] Empty states show appropriate messages

### ✅ Data Integrity
- [ ] Deals validate structure on load
- [ ] Invalid deals are cleaned automatically
- [ ] Status field defaults to 'none' if missing
- [ ] Data persists across browser sessions

## Test Scenarios

### Scenario 1: First-Time User
1. Open dashboard with no saved deals
2. Verify empty state message
3. Verify statistics show all zeros
4. Verify no table displayed

### Scenario 2: Multiple Deals
1. Have 10+ deals saved
2. Open dashboard
3. Verify all deals load
4. Verify statistics are correct
5. Verify table renders smoothly

### Scenario 3: Search & Filter
1. Type in search box
2. Verify results filter as you type (with debounce)
3. Select status filter
4. Verify combined filters work
5. Clear search
6. Verify all deals show again

### Scenario 4: Bulk Operations
1. Select multiple deals
2. Verify bulk actions bar appears
3. Change status of selected deals
4. Export selected deals
5. Delete selected deals
6. Verify operations complete successfully

### Scenario 5: Error Handling
1. Manually corrupt storage data (via DevTools)
2. Reload dashboard
3. Verify invalid deals are filtered
4. Verify warning toast appears
5. Verify dashboard still functions

### Scenario 6: Performance
1. Create 100+ test deals (if possible)
2. Open dashboard
3. Verify load time is acceptable
4. Test search performance
5. Test sort performance
6. Test render performance

## Browser DevTools Testing

### Console Checks
- No JavaScript errors
- Storage operations log correctly
- Toast notifications log correctly

### Network Tab
- No failed requests (all local storage)

### Application Tab
- Chrome Storage → Local → `savedDeals`
- Verify data structure
- Verify data persists

### Performance Tab
- Check render time
- Check filter/sort performance
- Identify bottlenecks

## Edge Cases to Test

1. **Very long deal names** - Does table handle overflow?
2. **Special characters** - Does CSV export handle quotes, commas?
3. **Missing fields** - Does dashboard handle deals with missing data?
4. **Concurrent operations** - Multiple tabs open?
5. **Storage quota** - What happens when storage is full?
6. **Rapid clicking** - Multiple quick status changes
7. **Empty search** - Search with empty string
8. **Invalid dates** - Deals with invalid savedAt dates

## Manual Test Data

### Create Test Deals
```javascript
// Run in browser console on a deal listing page
// This creates test deals with various properties
const testDeals = [
    {
        name: "Test Deal 1 - Hot",
        url: "https://example.com/deal1",
        savedAt: new Date().toISOString(),
        status: "hot",
        inputs: { asking: "1000000", ebitda: "200000" },
        results: { qualityScore: 85, cocReturn: "15%" }
    },
    {
        name: "Test Deal 2 - Warm",
        url: "https://example.com/deal2",
        savedAt: new Date(Date.now() - 86400000).toISOString(),
        status: "warm",
        inputs: { asking: "500000", ebitda: "100000" },
        results: { qualityScore: 65, cocReturn: "12%" }
    },
    // Add more test deals...
];

chrome.storage.local.set({ savedDeals: testDeals });
```

## Automated Testing (Future)

### Unit Tests Needed
- `parseNumber()` - Various formats
- `formatNumber()` - Edge cases
- `validateDeal()` - Valid/invalid structures
- `applyFiltersAndSort()` - Filter combinations
- `exportDealsToCSV()` - Special characters

### Integration Tests Needed
- Load → Filter → Sort → Export flow
- Status change → Save → Reload flow
- Bulk operations flow

## Reporting Issues

When reporting issues, include:
1. Browser version
2. Extension version
3. Number of deals
4. Steps to reproduce
5. Expected vs actual behavior
6. Console errors (if any)
7. Screenshots (if applicable)
