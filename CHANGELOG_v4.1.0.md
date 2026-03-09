# Changelog - Version 4.1.0

## Release Date
[To be determined after testing]

## Summary
Major UI/UX harmonization update bringing the web app's "My Deals" view in line with the Chrome extension's proven workflow and design patterns.

## What's New

### 🎨 My Deals View Redesign
Complete overhaul of the My Deals interface to match the Chrome extension:

**New Layout:**
- Stats dashboard showing Total, Hot, Warm, and Cold deal counts at a glance
- Powerful search, filter, and sort controls
- Professional table view with sortable columns
- Bulk action support for managing multiple deals at once

**Enhanced Features:**
- ✨ Search deals by name, URL, or notes
- 🔍 Filter by status (Hot, Warm, Cold, Pass, No Status)
- 📊 Sort by date, name, price, EBITDA (ascending or descending)
- ☑️ Select multiple deals for bulk actions
- 📤 Export to CSV (all, filtered, or selected deals)
- 🗑️ Bulk delete with confirmation
- 👁️ Click any row to view full deal details

**Deal Details Modal:**
- Full-screen modal with comprehensive deal information
- Editable status dropdown with emoji indicators
- Auto-saving notes (no need to click Save)
- **Broker Information Form:** Add/edit broker name, company, phone, email
- **Progress Tracking System:**
  - Select from 13 predefined deal stages (NDA, IOI, LOI, etc.)
  - View progress history with timestamps
  - Track deal pipeline progression
- Quick access to financial details (revenue, location, industry, years established)
- **Share Functionality:** Native share API or copy to clipboard
- **Calculator Access Note:** Directs to Deal Aggregator for full calculator
- View original listing, export, or delete actions

### 🔄 Status System Harmonization
Unified status values across extension and web app:
- 🔥 **Hot** - High-priority leads
- 🌡️ **Warm** - Promising opportunities
- ❄️ **Cold** - Lower priority deals
- ❌ **Pass** - Decided not to pursue
- **No Status** - Newly saved or unclassified

**Migration:** Existing deals with legacy statuses (`new`, `passed`, etc.) are automatically mapped to the new system.

### 📱 Mobile Responsive
- Optimized layout for mobile devices
- Touch-friendly controls and buttons
- Scrollable table on smaller screens
- Full-screen modal on mobile

### 🔧 Technical Improvements
- Data normalization layer for consistent API responses
- Improved error handling and user feedback
- Better performance with client-side filtering and sorting
- Cleaner component architecture
- **Extended API:** Broker fields and progress tracking now editable
- **Web Share API integration** for native sharing on mobile

## Breaking Changes
None. All existing functionality is preserved with improved UX.

## Database Changes
- Migration `harmonize_deal_statuses` updates existing deal statuses
- Default status changed from `new` to `none`
- Auto-runs on backend startup

## Files Changed
- **Created:**
  - `web/src/utils/normalizeDeal.js` - Data normalization utilities
  
- **Modified:**
  - `web/src/components/SavedDeals.jsx` - Complete rewrite
  - `web/src/pages/DashboardPage.jsx` - Added normalization
  - `web/src/styles/global.css` - New styles for harmonized UI
  - `backend/src/controllers/dealsController.js` - Status default update
  - `backend/src/db/migrate.js` - Status migration
  - `backend/src/index.js` - Version bump

## Upgrade Instructions

### For Users
1. Pull latest code
2. Install dependencies (if needed): `cd backend && npm install`
3. Restart backend - migration runs automatically
4. Clear browser cache and reload web app
5. All existing deals will show with updated status values

### For Developers
No special steps required. Database migration is automatic.

## Known Limitations
- Quality Score and COC Return show "—" (calculation not yet implemented)
- Full Deal Structure Calculator not in modal (use Deal Aggregator view for multi-scenario analysis)
- Backup/Restore not available (extension-specific feature)

## Testing Checklist
See `HARMONIZATION_SUMMARY.md` for comprehensive testing checklist.

## Credits
Harmonization based on proven UX patterns from the Chrome extension's My Deals tab (v2.1.6+).

---

**Previous Version:** 4.0.0
**Current Version:** 4.1.0
