# Release Notes - v2.1.9

**Release Date**: January 25, 2026

## 🎨 UI/UX Improvements

### Dark Mode Default
- **Dark mode is now the default theme** for all users
- Fixed in BOTH `deals-dashboard.html` (embedded CSS) AND `styles.css`
- `:root` CSS variables now define dark mode colors by default
- Light mode available via `.light-mode` class override
- Provides better visual comfort and reduced eye strain

### Bug Fixes

#### Fixed Button Modal Popups (Root Cause Identified)
- **RESOLVED**: Top action buttons (Manage Sources, Add Deal, Configure Buy Box) now work immediately on page load
- Previously these buttons would only work after clicking "My Deals" tab

**Root Cause #1**: The `DOMContentLoaded` event had already fired by the time the event listener was registered (scripts are loaded at end of body), so the initialization callback never ran.

**Root Cause #2 (THE REAL ISSUE)**: The modal HTML elements were nested INSIDE the `tab-my-deals` div. When the My Deals tab was not active (`display: none`), the modals inside it were also hidden - even when their display was set to `flex`.

**Solution**: 
1. **JavaScript Fix**: Converted initialization to `initializeDashboard()` function with proper `document.readyState` check
2. **JavaScript Fix**: Modal functions attached to `window` object for guaranteed global access
3. **HTML Structure Fix**: Moved the 4 global modals (source-management-modal, manual-deal-modal, buybox-modal, share-modal) OUTSIDE of tab-my-deals div
4. Restructured HTML so:
   - `tab-my-deals` contains: deal-modal, deals-container
   - Global modals are at body level (outside any tab content)

## 🔧 Technical Changes

### CSS Changes (deals-dashboard.html)
- `:root` now defines dark mode colors by default
- Added `.light-mode` class for light theme override
- Status badge colors adjusted for both themes

### CSS Changes (styles.css)  
- `#deal-analyzer-container` now has dark mode colors by default
- `.light-mode` class added for light theme override
- Link colors updated for both themes

### JavaScript Initialization Fix
- `initializeDashboard()` function replaces anonymous DOMContentLoaded callback
- Proper `document.readyState` check ensures initialization runs
- Modal functions (`openSourceManagementModal`, `openManualDealModal`, `openBuyBoxModal`) attached to `window` object
- Button handlers now use `window.functionName()` for guaranteed access
- Added comprehensive logging for debugging

## 📋 Files Modified

- `manifest.json` - Version bump to 2.1.9
- `styles.css` - Dark mode now default
- `deals-dashboard.js` - Fixed initialization timing, window-level function exports
- `deals-dashboard.html` - Dark mode CSS now default, version display updated

## 🧪 Testing Recommendations

1. **Hard refresh** the page (Cmd+Shift+R / Ctrl+Shift+R) to clear cache
2. Verify dark mode is active immediately on load (dark background)
3. Click "Manage Sources" button immediately after load - modal should open
4. Click "Add Deal" button immediately after load - modal should open
5. Click "Configure Buy Box" button immediately after load - modal should open
6. Open browser console to see initialization logs
7. Verify no JavaScript errors in console

## 🔍 Debug Information

Console should show:
```
🚀 DOM already ready, initializing immediately...
🚀 Initializing Deal Aggregator v2.1.9
✅ Setting up Fetch Deals button
✅ Setting up Manage Sources button
✅ Setting up Add Deal button
✅ Setting up Configure Buy Box button
✅ Global action buttons initialized
```

## ⚙️ Version Information

- **Current Version**: v2.1.9
- **Previous Version**: v2.1.8
- **Type**: Critical Bug Fix Release
