# Changelog

All notable changes to the Max Price Deal Analyzer extension will be documented in this file.

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
