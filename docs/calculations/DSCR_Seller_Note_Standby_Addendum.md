# Addendum: Seller Note Standby and Its Impact on DSCR & Max Allowable Offer

## Purpose
This addendum explains how a **seller note placed on full standby** affects:
- Debt Service calculations
- DSCR
- Maximum Allowable Purchase Price

This reflects **SBA lender treatment** of seller notes used as equity injection.

---

## What “Seller Note on Standby” Means (SBA Context)

A seller note on **full standby** means:
- No principal or interest payments
- For a defined period (typically **≥ 24 months**)
- Subordinate to SBA lender
- Treated as **quasi-equity**, not debt

When these conditions are met, **SBA lenders exclude the seller note from debt service** for DSCR purposes.

---

## Core Rule (Very Important)

> **If a seller note is on full standby, its debt service is excluded from DSCR calculations.**

This does **not** eliminate the note — it only removes its payments from the DSCR constraint.

---

## DSCR Math Without Standby (Baseline Case)

### Debt Service per $1 of Purchase Price

```
Total DS per $1 =
(SBA % × -PMT(SBA Rate, SBA Amort, 1))
+
(Seller % × -PMT(Seller Rate, Seller Amort, 1))
```

### Max Allowable Purchase Price

```
Max Price =
(EBITDA ÷ DSCR) ÷ Total DS per $1
```

In this structure:
- Seller note **reduces** max price
- All debt is counted against cash flow

---

## DSCR Math With Seller Note on Full Standby

### Debt Service per $1 of Purchase Price (Standby Case)

```
Total DS per $1 =
SBA % × -PMT(SBA Rate, SBA Amort, 1)
```

> Seller note debt service = **0** for DSCR purposes

### Max Allowable Purchase Price (Standby Case)

```
Max Price (Standby) =
(EBITDA ÷ DSCR) ÷ (SBA DS per $1)
```

---

## Practical Effect on Max Allowable Offer

### Comparison Example

Assumptions:
- EBITDA = $1,000,000
- Target DSCR = 1.25
- SBA: 90% @ 9.25% / 10 yrs
- Seller Note: 10% @ 5% / 5 yrs

### Without Standby
- Total DS per $1 ≈ 0.16
- Max Price ≈ $5.0M

### With Full Standby
- SBA DS per $1 ≈ 0.14
- Max Price ≈ $5.7M

**Result:**  
Seller note standby increases allowable price by **~10–15%**, all else equal.

---

## Key Lender Nuances

- Partial standby or interest-only notes **do NOT qualify**
- SBA must approve standby language explicitly
- After standby period ends, seller note payments resume
- DSCR is typically tested **without** seller note during standby

---

## Modeling Best Practice

### Recommended Toggle Logic

```
IF Seller_Note_Standby = TRUE:
    Seller_DS_per_$1 = 0
ELSE:
    Seller_DS_per_$1 = Seller % × PMT(...)
```

This keeps models:
- Non-circular
- Audit-safe
- SBA-aligned

---

## Interpretation Guidance

- Standby does **not** change valuation fundamentals
- It reallocates DSCR capacity to the SBA loan
- It is a **credit enhancement**, not free leverage

---

## Key Takeaway

> **A seller note on full standby increases the Max Allowable Offer by removing its debt service from the DSCR constraint — but only during the approved standby period.**

This is one of the most powerful (and misunderstood) levers in SBA deal structuring.
