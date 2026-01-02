# Changelog

All notable changes to the Max Price Deal Analyzer extension will be documented in this file.

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
