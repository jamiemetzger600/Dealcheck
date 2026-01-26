# Changelog

All notable changes to the Max Price Deal Analyzer extension will be documented in this file.

## [2.2.6] - 2026-01-25 - Filter View Update Improvements

### ✨ New Features
- **Modified indicator**: Visual indicator (*) shows when a filter view has been modified
- **Update button highlight**: Update button turns orange when view is modified
- **Keep view active**: Filter view stays active when you modify filters (buy box or NOT filters)
- **Easy updates**: Click "🔄 Update View *" to save changes to the current view

### 🎨 UI Improvements
- Modified views show asterisk (*) in dropdown and update button
- Update button changes to orange gradient when modifications detected
- Tooltip updates to indicate modified state
- Modified flag resets after updating or loading a view

### 🔧 Technical
- Added `filterViewModified` flag to track changes
- Modified state tracked when: buy box saved, NOT filters added/removed
- Modified state reset when: view updated, view loaded, filters cleared
- Visual feedback in both dropdown and update button

## [2.2.5] - 2026-01-25 - Filter Views Persistence Fix

### 🐛 Bug Fix
- **Fixed: Filter views not persisting after page refresh** - Saved filter views now properly load on page initialization
- Moved dropdown rendering to after filter views are loaded from storage
- Added comprehensive logging to track filter view save/load operations
- Filter views dropdown now populates correctly with saved views

### 🔧 Technical
- `renderFilterViewsDropdown()` now called after `loadFilterViews()` completes
- Removed premature dropdown rendering from `setupFilterViewsUI()`
- Added detailed console logging for debugging filter view operations
- Filter views are loaded before applying filters

## [2.2.4] - 2026-01-25 - State Filtering Fix

### 🐛 Critical Bug Fix
- **Fixed: State filtering not working** - Deals from states outside buy box were still showing
- Added `extractStateFromDeal()` function to properly extract state from location strings
- Now handles multiple formats: "Tampa, FL", "FL", "Florida", "Newark, NJ"
- Extracts state from `location`, `city`, `state`, or `rawFields`
- Updated CSV parser to extract and store state separately
- State filtering now works correctly with target and exclude states

### 🔧 Technical
- New `extractStateFromDeal()` function with comprehensive state extraction logic
- Supports state codes (FL, NY, CA) and full state names (Florida, New York)
- Checks multiple fields: `deal.state`, `deal.location`, `deal.city`, `deal.rawFields.State`
- CSV parser now extracts state and stores in `deal.state` field
- Regex patterns for various location formats

## [2.2.3] - 2026-01-25 - Filter Views & Bug Fixes

### 🐛 Critical Bug Fix
- **Fixed: No deals showing in table** - Buy box filtering was rejecting deals with missing price/EBITDA data
- Now only filters deals that HAVE the relevant data (e.g., if deal has no price, price filters don't apply)
- Deals with incomplete data are now shown unless they fail other criteria

### ✨ New Feature: Filter Views
- **Save Filter Views**: Save your current filter configuration (buy box + NOT filters) with a custom name
- **Load Filter Views**: Quickly switch between saved filter configurations
- **Update Views**: Modify and update existing filter views
- **Delete Views**: Remove filter views you no longer need
- **Clear All**: Reset all filters to defaults with one click
- Filter views persist across sessions
- Dropdown shows all saved views for quick access

### 🎨 UI Improvements
- New "Filter Views" section above the deals table
- Dropdown to select saved views
- Save/Update/Delete/Clear buttons for filter management
- Visual indication of which view is currently active
- Update button appears when viewing a saved filter

### 🔧 Technical
- Filter views stored in `chrome.storage.local.filterViews`
- Each view contains: id, name, config (buyBox + notFilterTags), timestamps
- `currentFilterViewId` tracks active view
- Auto-marks view as modified when filters change

## [3.0.0] - 2026-01-26 - Web Version Launch with Default Google Sheets
### ✨ New Features (Web Version)
- **Default Google Sheets source** - Automatically loads daily deal updates on first use
- **Welcome banner** - Guides new users to load deals from default source
- **Pre-configured column mapping** - Google Sheets columns automatically mapped to deal fields
- **One-click deal loading** - Click "Fetch Deals" to load from default Google Sheets

### 🌐 Web Deployment
- **Live at**: https://jackpops.vercel.app
- **Landing page** - Beautiful intro with feature overview
- **Mobile responsive** - Works on phone, tablet, desktop
- **Chrome API shim** - Replaces extension APIs with localStorage
- **Zero cost hosting** - Deployed on Vercel free tier

### 📊 Default Data Source
- Google Sheets: "Alesha Metzger - Daily Deal Update"
- URL: https://docs.google.com/spreadsheets/d/1BRxqznJiNw08Rrq0HF-eGqAg7lREkpsnhhXIkyV9BRw/edit?gid=697021806
- Auto-configured column mapping for all fields
- Includes deals from multiple brokers and listing sites

### 📚 Documentation
- Added `WEB_APP_MIGRATION_PLAN.md` - Comprehensive plan for web app transition
- Added `DEPLOYMENT_SUCCESS.md` - Deployment details and live URLs
- Added `QUICK_REFERENCE.md` - Quick reference card for beta testers
- Added `web/DEPLOY_GUIDE.md` - Step-by-step deployment instructions

## [Planning] - 2026-01-25
### Documentation
- Documented hybrid architecture (Chrome extension + Next.js web app)
- Outlined 5 implementation phases with Phase 0 (beta testing) as current focus
- Defined database schema, technology stack, and scaling strategy

## [2.2.2] - 2026-01-25 - Buy Box Filtering & NOT Filters

### 🐛 Bug Fixes
- **Fixed Buy Box Filtering**: Buy box criteria now properly filters the aggregator table (was only showing badge, not filtering deals)
- Buy box filters are now loaded on page load and applied automatically
- All filters (buy box, NOT filters, search) are now applied together correctly

### ✨ New Features
- **NOT Filter Tags**: Exclude deals matching specific keywords (e.g., "FedEx", "Cannabis", "Pharmacy")
- Add multiple NOT filter tags to exclude unwanted deals
- Tags are persistent across sessions
- Real-time filtering as tags are added/removed
- Visual red badges show active NOT filters
- Click "+" to add new exclusion keywords
- Click "×" on any tag to remove it

### 🔧 Technical
- Comprehensive `applyAllFilters()` function applies buy box, NOT filters, and search together
- `dealMatchesNotFilters()` checks all deal fields including raw data
- NOT filters stored in `chrome.storage.local.notFilterTags`
- Filters are re-applied when buy box is saved or reset
- Case-insensitive matching for NOT filters

## [2.2.1] - 2026-01-25 - Deal Details View System

### ✨ New Features
- **Clickable Deal Rows**: Click any deal in aggregator table to view full details
- **Dual View Modes**: Choose between sidebar (slide from right) or popup modal (center overlay)
- **User Preference Setting**: Configure view mode in Buy Box settings under "Display Preferences"
- **Comprehensive Details Display**: View all deal information including financials, location, industry, description, and raw fields
- **Buy Box Match Indicator**: Instantly see if deal matches your criteria (🎯)
- **Quick Actions**: Save to My Deals or open original link directly from detail view
- **Multiple Close Options**: Close button, overlay click, ESC key, or footer button
- **Journey Stage Integration**: Automatically advances to KNOWLEDGE stage when viewing details

### 🎨 UI/UX Improvements
- Smooth slide-in/out animations for sidebar
- Dimmed overlay background for better focus
- Gradient headers matching app theme
- Responsive design works in light and dark modes
- Hover effects on action buttons

### 🔧 Technical
- Deal view preference stored in `userPreferences.dealViewPreference`
- Modular deal details generation with reusable templates
- Centralized event handling for both view modes
- New CSS components: `.deal-sidebar`, `.deal-popup-modal`, `.deal-detail-section`

## [2.2.0] - 2026-01-25 - Full Google Sheets Parsing & Dynamic Columns

### ✨ New Features
- **Parse all columns** from Google Sheets / CSV; header row auto-detection for "Daily Deal Update" style sheets
- **Dynamic aggregator table**: built-in columns plus all `rawFields` from imported data
- **Columns** button: show/hide any column; **moveable headers**: drag to reorder (persisted)
- Sort and search work on all columns including raw fields

### 🔧 Technical
- `custom-source-manager`: full column import, `rawFields`, Date Added → discoveredAt, City+State → location, Annual Revenue → revenue
- Column prefs (`order`, `visibility`) in `userPreferences.aggregatorColumns`
- See `RELEASE_NOTES_v2.2.0.md` for details

## [1.5.0] - 2025-01-01 - Enhanced Multi-Platform Scraping

### ✨ New Features

#### 🔍 Advanced Multi-Platform Scraping System
- **Platform detection**: Automatically detects which site you're on (BizQuest, BizBuySell, Crexi, LoopNet, Zillow, Redfin, CoStar, Realtor.com)
- **Platform-specific scrapers**: Custom scraping logic optimized for each platform's unique DOM structure
- **Fallback scraping**: Generic scraper kicks in if platform-specific scraper doesn't find data
- **Enhanced currency parsing**: Now handles abbreviated formats (1.5M, 500K, 2.3B)
- **NOI support**: Recognizes Net Operating Income for commercial real estate listings
- **More keywords**: Expanded search for "Sale Price", "List Price", "NOI", etc.
- **Better extraction strategies**: 
  - Data attributes (React/Vue apps)
  - Table cells (next <td>)
  - JSON-LD structured data
  - Parent/sibling elements
  - Label/field pairs

#### 🛠️ Scraping Diagnostics Panel
- **New debug icon** (🔍) in header for troubleshooting
- **Real-time diagnostics**:
  - Shows detected platform
  - Displays scraped values (or "not found")
  - Platform-specific status indicator
  - URL and timestamp
- **Troubleshooting tips** built into the panel
- **Re-scrape button** to manually trigger scraping
- **Console logging guidance** for detailed debugging
- All scraping attempts logged to browser console with detailed strategies

### 🎨 UI Improvements
- Debug/diagnostics button in header toolbar
- Clean diagnostics modal with color-coded status indicators
- Helpful troubleshooting tips and guidance
- Professional info panels with best practices

### 🔧 Technical Improvements
- Modular scraper architecture for easy platform additions
- `waitForElement()` helper for dynamic content
- `detectPlatform()` function using hostname matching
- `lastScrapeData` tracking for diagnostics
- Comprehensive logging at every stage
- Enhanced regex patterns for currency extraction
- More robust element selection strategies

### 🌐 Supported Platforms
- **BizQuest**: Business listings with custom data structures
- **BizBuySell**: Business-for-sale marketplace
- **Crexi**: Commercial real estate platform
- **LoopNet**: CoStar's commercial property listings
- **Zillow**: Residential and commercial properties
- **Redfin**: Real estate listings
- **CoStar**: Commercial property database
- **Realtor.com**: Real estate marketplace
- **Generic**: Works on any site with labeled financial data

### 📝 Notes
This release addresses the high-priority bug fixes from the roadmap:
- ✅ Improved scraping reliability across platforms
- ✅ Better handling of dynamically loaded content
- ✅ Enhanced debugging tools for troubleshooting

---

## [1.5.0-beta] - 2025-01-01 - Target Offer Price Calculator

### ✨ New Features

#### 🎯 Target Offer Price Calculator
- **Reverse calculator** that tells you what price to offer to hit your target returns
- **Input your targets**: Uses your settings for COC return % and payback period
- **Smart calculation**: Automatically considers your financing structure (SBA, seller notes, etc.)
- **Price comparison**: Shows how your target offer compares to asking price with visual indicators
  - Green highlight when target is below asking (good opportunity)
  - Yellow highlight when target is above asking
  - Shows both dollar difference and percentage
- **Financing breakdown**: Displays assumptions used in the calculation
  - SBA loan amount and terms
  - Buyer equity required
  - Seller note details (if applicable)
  - Target DSCR and salary
- **Projected metrics**: Shows what your returns will be at the target price
  - Free cash flow
  - Total take-home
- **One-click application**: "Use This as Actual Price" button applies the calculated price
- **Collapsible section**: Clean UI that expands when you need it

#### How It Works
The calculator works backwards from your target COC return and payback period to determine the maximum price you should offer. It factors in:
- Your business EBITDA
- Target owner salary
- Complete financing structure (SBA %, equity %, seller note %)
- Loan terms and interest rates
- Target DSCR requirements

Example: "To achieve your 25% COC return in 4 years, offer: $1,245,000"

### 🎨 UI Improvements
- New collapsible "🎯 Target Offer Calculator" section
- Color-coded comparison indicators
- Financing assumptions clearly displayed
- Clean, intuitive interface

### 🔧 Technical Improvements
- Advanced financial math for reverse price calculation
- Validates all inputs before calculating
- Handles edge cases (standby notes, interest-only, etc.)
- Debug logging for troubleshooting

---

## [1.4.0] - 2024-12-31 - Quick Wins Release

### ✨ New Features

#### Deal Quality Score
- **Live scoring system** (0-100) that updates as you adjust inputs
- **Intelligent weighting**:
  - 40% - Price vs Max Allowable
  - 35% - Cash-on-Cash Return vs Target
  - 25% - Payback Period vs Target
- **Color-coded ratings**:
  - 🟢 Excellent (80-100): Strong deal
  - 🟡 Good (60-79): Acceptable deal
  - 🟠 Fair (40-59): Marginal deal
  - 🔴 Weak (0-39): Poor deal
- Banner display at top of extension showing current score

#### Settings & Customization
- **Settings modal** (⚙️ icon in header)
- **User-defined targets**:
  - Target Cash-on-Cash Return (default: 25%)
  - Target Payback Period (default: 4 years)
- **Display preferences**:
  - Compact number format (1.2M vs 1,200,000)
- Settings persist across sessions

#### Save & Load Deals
- **Save deals** with custom names for later reference
- **Deal library** - dropdown to quickly load saved deals
- **Auto-generated names** if none provided
- Each deal saves:
  - All inputs and assumptions
  - Calculated results
  - Notes
  - URL and timestamp
- **Update existing deals** by re-saving with same name

#### Deal Notes
- Dedicated text area for deal-specific notes
- Auto-saves every 1 second
- Persists with deal state
- Great for tracking:
  - Questions for seller
  - Red flags
  - Due diligence items
  - Follow-up tasks

#### Keyboard Shortcuts
- **Cmd/Ctrl + E**: Toggle extension visibility
- **Cmd/Ctrl + R**: Refresh/scrape data from page
- **Cmd/Ctrl + S**: Quick save current deal
- Power user efficiency improvements

### 🎨 UI Improvements
- Quality banner prominently displays deal score
- Settings accessible from header
- Save/Load section integrated cleanly
- Better visual hierarchy
- Responsive feedback on user actions

### 🔧 Technical Improvements
- Modular formatting functions
- User preferences stored separately
- Deal library management
- Debounced auto-save for performance
- All features work together seamlessly

---

## [1.3.4] - 2024-12-31

### 🐛 Bug Fixes
- Fixed console errors for null element access
- Fixed background.js connection errors
- Added proper message acknowledgment
- Improved error handling throughout

---

## [1.3.3] - 2024-12-31

### 🐛 Bug Fixes
- Extension now starts hidden by default
- Only appears when user clicks extension icon
- Prevents unwanted display on non-deal sites

---

## [1.3.0] - 2024-12-30

### ✨ New Features
- Cash-on-Cash Return calculator
- Payback Period calculator
- Collapsible sections for cleaner UI
- Professional PDF export with formatting

---

## [1.2.0] - 2024-12-30

### ✨ New Features
- Extension icon toggle functionality
- Share module (Email, SMS, AirDrop, Clipboard)
- UI positioning improvements
- Drag constraints

---

## [1.1.2] - 2024-12-29

### ✨ New Features
- Salary validation warnings
- Standby seller note support
- UI improvements and condensing

---

## [1.0.0] - 2024-12-28

### 🎉 Initial Release
- DSCR-based max price calculator
- Smart scraping from BizQuest, BizBuySell, Crexi
- Draggable window interface
- SBA loan calculator
- Seller note support
- Persistent settings storage
- Free cash flow projections
- Owner take-home calculations

---

## Upcoming Features

See [ROADMAP.md](ROADMAP.md) for planned features and future enhancements.

### Next Priority (v1.5.0)
- Multi-deal comparison view
- Deal pipeline dashboard
- Export saved deals to CSV
- Delete saved deals
- Deal tags/categories

### Future Enhancements
- Comparable deals analysis
- Working capital calculator
- Break-even analysis
- Exit strategy calculator
- Industry-specific presets
- Team sharing features

---

## Monetization Plans

### Freemium Model
**Free Tier:**
- Basic calculator
- 5 saved deals max
- Limited PDF exports

**Premium ($14.99/mo or $149/year):**
- Unlimited saved deals
- Comp analysis module
- Multi-deal comparison
- Advanced analytics
- Priority support
- Export to Excel
- Team sharing

**Target Market:**
- Business buyers (search fund, ETA)
- SBA borrowers
- Business brokers
- M&A advisors
- Private equity analysts

**Revenue Goal:**
- Year 1: $25K (150 paid users)
- Year 2: $100K (500 paid users)
- Year 3: $250K (1,250 paid users)
