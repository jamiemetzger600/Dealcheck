# Deal Quality Scoring System - Validation Report

**Date:** January 24, 2026  
**Purpose:** Validate the current Deal Quality scoring methodology against industry standards and best practices

---

## Current Implementation Summary

### Scoring Components (Total: 100 points)

| Component | Weight | Max Points | Description |
|-----------|--------|------------|-------------|
| **Price Score** | 40% | 40 | Compares asking price to calculated max price |
| **Cash-on-Cash Return** | 35% | 35 | Compares actual COC to user's target COC |
| **Payback Period** | 25% | 25 | Compares actual payback to user's target payback |

### Default Targets
- **Target COC:** 25% (user-configurable)
- **Target Payback:** 4 years (user-configurable)

### Scoring Thresholds

#### Price Component (40 points)
- `askingPrice ≤ maxPrice` → **40 points** (perfect)
- `askingPrice ≤ 1.1 × maxPrice` → **30 points** (10% over)
- `askingPrice ≤ 1.2 × maxPrice` → **20 points** (20% over)
- `askingPrice ≤ 1.3 × maxPrice` → **10 points** (30% over)
- `askingPrice > 1.3 × maxPrice` → **0 points**

#### COC Component (35 points)
- `COC ≥ 1.5 × targetCOC` → **35 points** (50% above target)
- `COC ≥ targetCOC` → **30 points** (at/above target)
- `COC ≥ 0.75 × targetCOC` → **20 points** (75% of target)
- `COC ≥ 0.5 × targetCOC` → **10 points** (50% of target)
- `COC < 0.5 × targetCOC` → **0 points**

#### Payback Component (25 points)
- `payback ≤ 0.75 × targetPayback` → **25 points** (25% faster)
- `payback ≤ targetPayback` → **20 points** (at/better than target)
- `payback ≤ 1.5 × targetPayback` → **15 points** (within 50% of target)
- `payback ≤ 2 × targetPayback` → **5 points** (within 2x target)
- `payback > 2 × targetPayback` or invalid → **0 points**

---

## Industry Research Findings

### 1. Scoring Framework Standards ✅

**Finding:** Industry-standard deal evaluation frameworks use:
- **100-point scale** (standard practice)
- **Weighted criteria** that sum to 100%
- **Multiple metrics** rather than single-factor analysis

**Validation:** ✅ **PASS** - Your system aligns with industry standards

### 2. Cash-on-Cash Return as Primary Metric ✅

**Finding:** 
- COC Return is the **primary return metric** for small business acquisitions
- Industry sources emphasize COC heavily in deal evaluation
- 25% COC is considered a "good return" benchmark
- ROI expectations vary by industry, but 20-30% is common range

**Validation:** ✅ **PASS** - Your 35% weight on COC is appropriate and aligns with industry emphasis

**Note:** Default target of 25% COC is reasonable and aligns with "good return" benchmarks

### 3. Payback Period Usage ⚠️

**Finding:**
- Payback period is commonly used as a **screening tool** (initial filter)
- **3 years** is frequently cited as maximum acceptable threshold
- Less emphasized than COC in final scoring
- Often used alongside other metrics (IRR, MOIC)

**Validation:** ⚠️ **PARTIAL** - Your 25% weight is reasonable, but:
- Default of 4 years is slightly more conservative than industry's common 3-year threshold
- This is acceptable as it's user-configurable and conservative is safer

### 4. Price/Valuation Weighting ⚠️

**Finding:**
- M&A frameworks typically weight "valuation relative to peers" at **~10%**
- Strategic factors (synergy, growth) often weighted higher (25-30%)
- Price is important but less weighted than returns in sophisticated frameworks

**Validation:** ⚠️ **CONSIDER REVIEW** - Your 40% weight on price is:
- **Higher** than typical M&A frameworks (which use ~10%)
- However, for **small business acquisitions**, price discipline is critical
- Your approach may be appropriate for this market segment

**Recommendation:** Consider if 40% is optimal, or if COC should be weighted higher

### 5. Threshold Analysis ✅

#### Price Thresholds
- **0-10% over max:** 30-40 points → Reasonable tolerance
- **10-20% over max:** 20-30 points → Appropriate penalty
- **20-30% over max:** 10-20 points → Strong penalty
- **>30% over max:** 0 points → Complete rejection

**Validation:** ✅ **PASS** - Thresholds are logical and progressive

#### COC Thresholds
- **≥1.5× target:** 35 points → Rewards exceptional returns
- **≥1.0× target:** 30 points → Rewards meeting target
- **≥0.75× target:** 20 points → Acceptable but below target
- **≥0.5× target:** 10 points → Poor but not zero
- **<0.5× target:** 0 points → Unacceptable

**Validation:** ✅ **PASS** - Progressive scoring with appropriate rewards/penalties

#### Payback Thresholds
- **≤0.75× target:** 25 points → Excellent (faster payback)
- **≤1.0× target:** 20 points → Meets target
- **≤1.5× target:** 15 points → Acceptable delay
- **≤2.0× target:** 5 points → Poor but not zero
- **>2.0× target:** 0 points → Unacceptable

**Validation:** ✅ **PASS** - Logical progression, though 2× target may be generous

---

## Strengths of Current System

1. ✅ **User-Configurable Targets** - Allows personalization (90% COC, 1 year payback, etc.)
2. ✅ **100-Point Scale** - Industry standard
3. ✅ **Multiple Metrics** - Not relying on single factor
4. ✅ **Progressive Scoring** - Smooth transitions between thresholds
5. ✅ **COC Emphasis** - Aligns with industry focus on returns
6. ✅ **Price Discipline** - Important for small business acquisitions
7. ✅ **Clear Visual Feedback** - Color-coded badges (🟢🟡🟠🔴)

---

## Potential Areas for Consideration

### 1. Component Weighting ⚠️

**Current:** Price 40% | COC 35% | Payback 25%

**Industry Comparison:**
- M&A frameworks: Returns/Value ~25-35%, Strategic ~25-30%, Price ~10%
- Your system: Price 40%, Returns (COC) 35%, Payback 25%

**Consideration:** 
- For small business acquisitions, price discipline may justify higher weight
- However, COC is the primary return metric and might warrant equal or higher weight than price

**Potential Alternative:** Price 35% | COC 40% | Payback 25%

### 2. Missing Metrics (Optional Enhancement)

**Industry uses:**
- **IRR (Internal Rate of Return)** - Time-weighted return
- **MOIC (Multiple on Invested Capital)** - Total return multiple
- **DSCR Coverage** - Debt service safety margin

**Current Status:** Not included in scoring (though DSCR is used in max price calculation)

**Recommendation:** Current system is sufficient for initial screening. Advanced metrics could be added later if users request.

### 3. Payback Period Default

**Current:** 4 years default  
**Industry:** 3 years commonly cited as maximum acceptable

**Status:** ✅ Acceptable - Conservative default is safer, and it's user-configurable

### 4. Edge Cases

**Current Handling:**
- Invalid payback (≥100 years) → 0 points ✅
- Missing maxPrice → 0 points from price component ✅
- COC < 50% of target → 0 points ✅

**Validation:** ✅ Edge cases are handled appropriately

---

## Overall Assessment

### ✅ **VALIDATED - System is Acceptable**

**Summary:**
Your Deal Quality scoring system aligns well with industry standards and best practices for small business acquisition evaluation. The methodology is sound, thresholds are logical, and the user-configurable approach is excellent.

### Key Validations:

1. ✅ **100-point scale** - Industry standard
2. ✅ **COC as primary metric** - Aligns with industry emphasis
3. ✅ **Multiple metrics approach** - Best practice
4. ✅ **Progressive thresholds** - Logical scoring progression
5. ✅ **User-configurable targets** - Allows personalization
6. ✅ **Default targets reasonable** - 25% COC, 4-year payback are conservative and appropriate

### Minor Considerations:

1. ⚠️ **Price weight (40%)** - Higher than typical M&A frameworks, but may be appropriate for small business market
2. ⚠️ **COC weight (35%)** - Could potentially be equal to or higher than price weight
3. ✅ **Payback default (4 years)** - Slightly conservative vs. industry's 3-year common threshold, but acceptable

---

## Recommendations

### Immediate Actions: **NONE REQUIRED**

The current system is acceptable and functional. No critical changes needed.

### Optional Enhancements (Future Consideration):

1. **Consider rebalancing weights** (if user feedback suggests):
   - Option A: Price 35% | COC 40% | Payback 25%
   - Option B: Keep current (Price 40% | COC 35% | Payback 25%)

2. **Add advanced metrics** (if users request):
   - IRR calculation and scoring
   - MOIC tracking
   - DSCR safety margin scoring

3. **Enhanced documentation**:
   - Tooltip explaining scoring methodology
   - Breakdown showing contribution of each component

---

## Conclusion

**✅ Your Deal Quality scoring system is VALIDATED and ACCEPTABLE.**

The system follows industry best practices, uses appropriate metrics, and provides a sound framework for evaluating small business acquisition deals. The user-configurable targets are a significant strength, allowing investors with different risk profiles and return expectations to customize the scoring to their needs.

**No changes required** - the system is production-ready and aligns with industry standards.

---

## References

- M&A Execution Toolkit (Umbrex)
- Small Business Acquisition Evaluation Guides (Acquira, BizBuySell)
- Real Estate Investment Deal Analysis Frameworks
- Cash-on-Cash Return Benchmarks for Small Business
- Payback Period Analysis Standards
