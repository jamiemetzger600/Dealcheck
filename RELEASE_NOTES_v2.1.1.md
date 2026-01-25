# Release Notes - v2.1.1

**Release Date:** January 25, 2026

## Summary
Quick UX improvement to make Deal Aggregator controls always accessible, even when no deals are loaded.

---

## ✨ What's New

### Always-Visible Aggregator Controls
- **Fetch Deals** button is now always visible at the top of the Deal Aggregator tab
- **Manage Sources** button accessible even when no deals are loaded
- **Add Deal** button accessible even when no deals are loaded
- **Configure Buy Box** button accessible even when no deals are loaded

This resolves the issue where users couldn't manage sources or add deals until they had already fetched deals, which was a confusing UX flow.

---

## 🎯 User Benefits

1. **Better Discoverability**: New users can immediately see and access all main features
2. **More Intuitive**: Users can manage sources before fetching deals, which is the natural workflow
3. **Add Off-Market Deals Anytime**: Users can add manual deals even before aggregating from RSS feeds
4. **Clearer Actions**: The "Fetch Deals" button makes it clear how to get started

---

## 🔧 Changes Made

### Files Modified
- `deals-dashboard.html` - Added always-visible control bar above empty state
- `deals-dashboard.js` - Added event listeners for new top control buttons
- `manifest.json` - Version bump to 2.1.1

### UI Changes
- Added persistent control bar with 4 action buttons at the top of Deal Aggregator tab
- Renamed "Start Aggregating Deals" to "Fetch Deals" for clarity
- Controls remain visible regardless of whether deals are loaded or not

---

## 🧪 Testing Required

1. **Empty State Testing**
   - Open Deal Aggregator with no deals
   - Verify all 4 buttons are visible: Fetch Deals, Manage Sources, Add Deal, Configure Buy Box
   - Click each button to ensure they work correctly

2. **With Deals Testing**
   - Fetch some deals
   - Verify the top control bar remains visible and functional
   - Verify the table controls still work as expected

3. **Functionality Testing**
   - Test "Fetch Deals" button fetches RSS feeds
   - Test "Manage Sources" opens source management modal
   - Test "Add Deal" opens manual deal entry form
   - Test "Configure Buy Box" shows coming soon message

---

## 📝 Notes

- This is a minor UX improvement release
- No breaking changes or API modifications
- All existing functionality remains intact
- Storage format unchanged

---

## 🐛 Bug Fixes

None in this release.

---

## 🚀 Next Steps

This sets up better UX for Phase 2 completion. Next priorities:
1. Complete RSS feed integration testing
2. Test custom source imports (Google Sheets, CSV)
3. Verify deal deduplication logic
4. Test manual deal entry with all fields

---

## Version History
- **v2.1.1** - Always-visible aggregator controls (Current)
- **v2.1.0** - Deal Aggregator Phase 2 launch
- **v2.0.0** - Complete platform redesign with journey stages
