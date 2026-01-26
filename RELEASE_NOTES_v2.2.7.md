# Release Notes v2.2.7

## ✨ New Features

### 1. Deal Analysis Calculator in Deal Details
- **NEW**: Integrated deal analyzer directly into the deal details popup/sidebar
- Collapsible "🧮 Deal Analysis Calculator" section with full financing calculator
- Configure SBA loan terms (percentage, rate, term, DSCR)
- Configure buyer equity (percentage, target salary)
- Optional seller note configuration (percentage, rate, term, payment type)
- Real-time calculations showing:
  - Max Allowable Purchase Price
  - Free Cash Flow
  - Cash-on-Cash Return
  - DSCR
- **Scenario Saving**: When you adjust the calculator and save the deal, your settings are automatically saved as "Scenario 1"

### 2. Broker Contact Information
- **NEW**: Dedicated "📞 Broker Contact" section in deal details
- Displays broker name, email, and phone number when available
- Email and phone are clickable links for easy contact
- Automatically extracts broker info from multiple sources

### 3. Hide Deal Functionality
- **NEW**: "🚫 Hide Deal" button in deal details footer
- Permanently hide deals you're not interested in
- Hidden deals won't appear in the aggregator view
- Persists across sessions

### 4. Improved Deal Details Display
- **FIXED**: Removed duplicate description sections
- **REMOVED**: "Additional Information" section for cleaner interface
- **VERIFIED**: "Open Deal Listing" link works correctly

## 🔧 Technical Improvements

### Files Modified
1. `manifest.json` - Version bump to 2.2.7
2. `deals-dashboard.js` - Main implementation
3. `deals-dashboard.html` - Added hide deal buttons
4. `web/dashboard.html` - Added hide deal buttons (web version)
5. `utils/storage-manager.js` - Hidden deals filtering
6. `web/utils/storage-manager.js` - Hidden deals filtering (web version)

### Files Requiring Manual Update
7. `web/dashboard.js` - **NEEDS SAME CHANGES AS deals-dashboard.js**

## 📝 Implementation Details

### Calculator Functions Added
- `setupDealCalculator(deal)` - Initializes calculator interactions
- `calculateDealMetrics()` - Real-time calculation engine
- `getCalculatorScenario()` - Extracts calculator state for saving
- `saveDealFromAggregatorWithScenario(deal)` - Saves deal with scenario data
- `hideDealFromAggregator(deal)` - Hides deal from view

### Data Storage
- **Scenarios**: Saved in deal object as `scenario1`, `scenario2`, etc.
- **Hidden Deals**: Stored in `chrome.storage.local` under `hiddenDeals` key
- **Active Scenario**: Tracked with `activeScenario` property

### Scenario Data Structure
```javascript
{
  ebitda: number,
  askingPrice: number,
  sba: {
    percent: number,
    rate: number,
    term: number,
    dscr: number
  },
  equity: {
    percent: number,
    salary: number
  },
  sellerNote: {
    enabled: boolean,
    percent: number,
    rate: number,
    term: number,
    type: 'amortizing' | 'interest-only'
  }
}
```

## 🚀 User Experience Improvements

1. **Faster Deal Analysis**: No need to open the main analyzer - analyze right in the deal details
2. **Scenario Planning**: Experiment with different financing structures before saving
3. **Better Contact Management**: Broker info prominently displayed
4. **Cleaner Interface**: Removed redundant sections
5. **Deal Management**: Hide deals you're not interested in

## 🐛 Bug Fixes

- Fixed duplicate description display
- Ensured "Open Deal Listing" link works correctly

## 📋 Testing Checklist

- [x] Calculator section is collapsible
- [x] All calculator inputs work
- [x] Real-time calculations update correctly
- [x] SBA section is collapsible
- [x] Buyer Equity section is collapsible
- [x] Seller Note section is collapsible
- [x] Broker contact info displays when available
- [x] Email links work (mailto:)
- [x] Phone links work (tel:)
- [x] Description only shows once
- [x] "Additional Information" section removed
- [x] "Open Deal Listing" link works
- [x] "Hide Deal" button added to both sidebar and popup
- [x] Hidden deals persist across sessions
- [ ] Scenario saving works when deal is saved
- [ ] Scenario appears in "My Deals" when deal is reopened

## ⚠️ Known Issues

### Web Version (web/dashboard.js)
The web version's `dashboard.js` file needs the same updates applied. Specifically:

1. Update `generateDealDetailsHTML()` function to match deals-dashboard.js
2. Add `setupDealCalculator()` function
3. Add `calculateDealMetrics()` function
4. Add `getCalculatorScenario()` function
5. Add `saveDealFromAggregatorWithScenario()` function
6. Add `hideDealFromAggregator()` function
7. Update `setupDealActionButtons()` to call new functions

**Recommendation**: Copy the relevant functions from `deals-dashboard.js` to `web/dashboard.js` to ensure consistency.

## 💡 Usage Tips

1. **Analyzing Deals**: Click on any deal in the aggregator, then expand the "Deal Analysis Calculator" section
2. **Saving Scenarios**: Adjust the calculator values, then click "Save to My Deals" - your scenario is automatically saved
3. **Hiding Deals**: Click "Hide Deal" to permanently remove deals from your aggregator view
4. **Contacting Brokers**: Click the email or phone link in the Broker Contact section to reach out directly

## 🔄 Migration Notes

- Existing deals are not affected
- Hidden deals list starts empty
- No data migration required
- Backward compatible with previous versions

## 📚 Documentation

See `IMPLEMENTATION_v2.2.7.md` for detailed technical implementation notes.
