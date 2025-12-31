# Changelog

All notable changes to the Deal Analyzer Chrome Extension will be documented in this file.

## [1.3.0] - 2024-12-30

### Added
- ROI Calculator with Cash-on-Cash Return and Payback Period metrics
- Professional PDF export with color-coded sections and clickable listing links
- PDF sharing via AirDrop and native share
- Actual dollar amounts in share text for financing structure

### Changed
- **FIXED: ROI calculations now use Total Owner Take-Home** (salary + FCF) instead of just FCF
- Simplified ROI metrics - removed 5-Year ROI and Equity Multiple, kept Year 1 focus
- Renamed "Actual Purchase Price" to "Offer Price"
- Updated color coding thresholds for Cash-on-Cash Return (100%+ excellent, 50%+ good, 25%+ okay)
- Made UI more compact with reduced font sizes, padding, and spacing throughout
- Reduced dropdown text size to match other inputs

### Fixed
- ROI calculations now accurately reflect true return on investment
- Payback period now correctly calculates time to recover equity
- PDF generation error handling improved
- All "Affordable" terminology changed to "Allowable" for consistency

## [1.2.0] - 2024-12-30

### Added
- Extension icon click support - toggle window visibility without page refresh
- Share functionality with multiple options:
  - Email sharing with pre-filled deal summary
  - SMS sharing for mobile devices
  - Native share API support (includes AirDrop on Mac/iOS)
  - Copy to clipboard with visual confirmation
- Background service worker for extension icon handling
- Share modal with clean UI for all sharing options

### Changed
- Renamed "Actual Purchase Price" to "Offer Price" for clarity
- Improved window positioning - now starts at 120px from top (was 50px)
- Added drag constraints to prevent window from being lost above viewport
- Window can no longer be dragged above 10px from top or below visible area

### Fixed
- Window now appears when clicking extension icon (no page refresh needed)
- Window positioning no longer conflicts with Chrome toolbar
- Dragging window above toolbar no longer makes it unrecoverable

## [1.1.2] - 2024-12-29

### Added
- Version number display in header (v1.1.2)
- Salary validation warning when target salary exceeds available cash flow
- "Total Owner Take-Home" display showing Salary + Free Cash Flow
- Max available cash flow indicator in owner take-home section
- Standby seller note support in DSCR calculations (excludes standby notes from debt service)

### Changed
- Condensed EBITDA and Asking Price fields to single row
- Reduced spacing throughout UI for more compact display
- Combined Standby, Interest Rate, and Payment Type fields on one line in Seller Note section
- Updated label from "Business EBITDA (or Adjusted SDE)" to "Business EBITDA"
- Renamed "Available for Owner Salary" to "Total Owner Take-Home"

### Fixed
- Seller note standby logic now properly excludes debt service from DSCR calculation per SBA lender treatment
- Improved field alignment in flex rows

## [1.0.0] - 2024-12-28

### Added
- Initial release
- DSCR-based Max Allowable Purchase Price calculation
- SBA loan configuration (percentage, rate, term, target DSCR)
- Buyer equity input
- Optional seller note financing with interest-only or amortizing options
- Auto-scraping of EBITDA/SDE and Asking Price from listing pages
- SDE adjustment (subtracts $200k for owner salary)
- Free cash flow calculations (annual and monthly)
- Deal opportunity detection (when asking < max allowable)
- Draggable floating window interface
- Persistent settings storage
- Debug logging for calculations

