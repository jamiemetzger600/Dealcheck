# Deal Analyzer - Product Roadmap

## Version 1.5.0 - Target Offer Price Calculator (Planned)

### Feature: Reverse Calculator - "What Should I Offer?"

**Goal:** Auto-suggest a maximum offer price that would achieve the user's target COC return and Payback period settings.

**User Story:**
As a buyer, I want to know what offer price I should make to achieve my target 25% COC return and 4-year payback period, so I can negotiate confidently.

**Technical Requirements:**

1. **Input Variables:**
   - Target Cash-on-Cash Return (%) - from user settings
   - Target Payback Period (years) - from user settings
   - Business EBITDA/SDE
   - Target Owner Salary
   - Financing structure:
     - SBA loan percentage
     - SBA interest rate & term
     - Buyer equity percentage
     - Seller note (if enabled):
       - Percentage
       - Interest rate
       - Payment type (amortizing/interest-only)
       - Standby (yes/no)
   - Target DSCR

2. **Calculation Logic:**
   - Work backwards from target ROI metrics to determine maximum offer price
   - Consider multiple financing scenarios:
     - Standard SBA + Equity
     - SBA + Equity + Seller Note
     - Different seller note structures (standby vs. non-standby)
   - Ensure DSCR requirements are met
   - Account for debt service in cash flow calculations

3. **Output Display:**
   - "Recommended Offer Price" box/section
   - Show calculation breakdown:
     - "To achieve your 25% COC target, offer: $X,XXX,XXX"
     - "This assumes: [financing structure summary]"
   - Compare to asking price:
     - "Asking price is $XXX,XXX higher/lower than your target"
     - Percentage difference
   - Show resulting metrics at recommended price:
     - Actual COC return
     - Actual payback period
     - Free cash flow
     - Total owner take-home

4. **UI/UX Considerations:**
   - Add new section: "🎯 TARGET OFFER CALCULATOR"
   - Collapsible panel (like other sections)
   - "Calculate Target Offer" button
   - Visual indicator if asking price is above/below target
   - Allow user to toggle between different financing scenarios
   - Option to copy/share the recommended offer analysis

5. **Edge Cases to Handle:**
   - EBITDA too low to support any reasonable offer
   - Targets are unrealistic (e.g., 100% COC with 10% down)
   - Seller note required to make deal work
   - Multiple valid offer prices based on different structures

6. **Possible Enhancements:**
   - Show 3 scenarios: Conservative, Moderate, Aggressive
   - Sensitivity analysis: "If EBITDA is actually X% lower..."
   - Integration with "Deal Opportunity" alert
   - Export recommended offer with justification to PDF

---

## Version 1.6.0 - Multi-Scenario Comparison (Planned)

### Feature: Side-by-Side Deal Comparison
- Compare multiple financing structures
- Compare multiple saved deals
- Visual charts/graphs for key metrics

---

## Version 1.7.0 - Advanced Features (Planned)

### Feature Ideas:
- Historical deal tracking (see how your portfolio performs)
- Integration with other listing sites (BizBuySell, Crexi, LoopNet)
- Email alerts for deals matching criteria
- Team collaboration (share deals with partners)
- Export to Excel with formulas
- Integration with accounting software

---

## Bug Fixes & Improvements (Ongoing)

### High Priority:
- [ ] Fix scraping reliability for BizQuest listings (v1.4.4)
- [ ] Handle dynamically loaded content better

### Medium Priority:
- [ ] Add keyboard shortcuts cheat sheet
- [ ] Improve mobile/responsive design
- [ ] Add dark mode support

### Low Priority:
- [ ] Localization (support for other currencies)
- [ ] Custom branding for brokers

---

## Completed Features

### v1.4.3 (Dec 2024)
- ✅ Show negative cash flow values (instead of capping at $0)
- ✅ Red color for negative values
- ✅ Improved negative number formatting

### v1.4.2 (Dec 2024)
- ✅ Enhanced scraping for "Cash Flow" vs "EBITDA"
- ✅ Better handling of "Not Disclosed" values
- ✅ Debug logging for scraper troubleshooting

### v1.4.1 (Dec 2024)
- ✅ Deal Quality Score (0-100)
- ✅ User-configurable targets (COC, Payback)
- ✅ Settings modal with preferences
- ✅ Compact number formatting option

### v1.4.0 (Dec 2024)
- ✅ Save/load deals functionality
- ✅ Deal notes field
- ✅ Keyboard shortcuts (Cmd+S to save)
- ✅ PDF export with business name
- ✅ AirDrop support for sharing

---

## Feature Requests
(Add new ideas here)

- Target Offer Price Calculator (v1.5.0)
- ???

