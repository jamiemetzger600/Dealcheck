# Testing Guide for v1.5.0 - Target Offer Calculator

## Setup

1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the "Gemini Deal Analyzer" folder
5. Navigate to test.html at `http://localhost:8099/test.html`

## Test Scenarios

### Test 1: Basic Target Offer Calculation

**Inputs:**
- EBITDA: $500,000
- Target Salary: $150,000
- Target COC Return: 25%
- Target Payback: 4 years
- SBA: 80% @ 11.5% for 10 years
- Equity: 20%
- No seller note

**Expected Behavior:**
1. Click extension icon to open Deal Analyzer
2. EBITDA should auto-populate as $500,000
3. Navigate to "🎯 Target Offer Calculator" section
4. Click "Calculate Target Offer Price" button
5. Results should appear showing:
   - Recommended offer price
   - Comparison to $2M asking price
   - Financing breakdown
   - Projected metrics

**Manual Verification:**
```
Given:
- EBITDA: $500,000
- Equity: 20%
- Target COC: 25%
- SBA DS per $1: ~0.1356

Formula: P = EBITDA / (targetCOC × equity% + debtServicePer$1)
P = $500,000 / (0.25 × 0.20 + 0.80 × 0.1356)
P = $500,000 / (0.05 + 0.1085)
P = $500,000 / 0.1585
P ≈ $3,154,574

At this price:
- Equity: $630,915
- SBA Loan: $2,523,659
- Annual Debt Service: $342,186
- Total Take-Home: $157,814
- COC: $157,814 / $630,915 = 25% ✓
```

### Test 2: With Seller Note

**Inputs:**
- Same as Test 1, but add:
- Seller Note: 10%
- Interest Rate: 6%
- Payment Type: Amortizing (5 years)
- Standby: No
- Adjust SBA to 70%, Equity to 20%

**Expected Behavior:**
- Target price should be different
- Financing breakdown should show seller note details
- Comparison section should still work

### Test 3: Edge Cases

**Test 3a: EBITDA too low**
- EBITDA: $0
- Should show alert: "Please enter a valid EBITDA value first."

**Test 3b: Financing doesn't add to 100%**
- SBA: 80%, Equity: 10%, Seller Note: 5% (total: 95%)
- Should show alert: "Total financing percentages must equal 100%..."

**Test 3c: No equity**
- SBA: 100%, Equity: 0%
- Should show alert: "Equity percentage must be greater than 0..."

### Test 4: Use Target Offer Price

**Steps:**
1. Calculate a target offer (e.g., Test 1)
2. Click "✓ Use This as Actual Price" button
3. Verify:
   - Actual Price field updates to target offer
   - Main calculations recalculate
   - Button shows "✓ Applied!" feedback
   - Deal metrics update in Actual Deal Scenario section

### Test 5: Collapsible Section

**Steps:**
1. Click on "🎯 Target Offer Calculator" header
2. Section should collapse (arrow rotates)
3. Click again to expand
4. State should persist on page refresh

### Test 6: Settings Integration

**Steps:**
1. Click Settings (⚙️) icon
2. Change Target COC to 30%
3. Change Target Payback to 3 years
4. Save settings
5. Go back to Target Offer Calculator
6. Display should show new targets: "COC: 30%, Payback: 3yr"
7. Recalculate - result should reflect new targets

## Visual Verification

### Comparison Indicators

**When target < asking:**
- Background: Light green (#d4edda)
- Border: Green (#28a745)
- Text: Red with "-$XXX (below asking)"
- This is GOOD - you're offering less than asking

**When target > asking:**
- Background: Light yellow (#fff3cd)
- Border: Yellow (#ffc107)
- Text: Green with "+$XXX (above asking)"
- This is acceptable - your target justifies higher price

## Known Limitations

1. Scenario toggle feature (v1.5.0) - Cancelled. Users adjust financing manually.
2. Calculator assumes seller note term of 5 years for amortizing calculations
3. Does not account for working capital or earnouts
4. Target salary is shown in breakdown but not factored into COC calculation (COC is based on total available cash)

## Debugging

If calculator doesn't work:
1. Open Chrome DevTools (F12)
2. Check Console for errors
3. Look for logs starting with "=== TARGET OFFER CALCULATOR ==="
4. Verify all DOM elements exist:
   - `da-calculate-target-offer-btn`
   - `da-target-offer-results`
   - `da-target-offer-price`

## Success Criteria

✅ All 6 tests pass
✅ No console errors
✅ Visual indicators work correctly
✅ Settings integration works
✅ Calculations are mathematically correct
✅ UI is intuitive and responsive


