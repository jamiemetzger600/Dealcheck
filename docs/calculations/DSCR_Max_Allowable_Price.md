# DSCR-Based Maximum Allowable Purchase Price

## Purpose
This document explains how to calculate the **maximum allowable purchase price** for a small business using **Debt Service Coverage Ratio (DSCR)**, starting from **EBITDA**. This approach mirrors how SBA lenders underwrite deals and sets a hard ceiling on price based on cash flow, debt terms, and leverage.

This methodology is **price-backward**, not multiple-driven.

---

## Key Definitions

- **EBITDA**  
  Bank-underwritten EBITDA or Cash Flow Available for Debt Service (CFADS), after normalization.

- **DSCR (Debt Service Coverage Ratio)**  
  Minimum ratio required by lender (e.g. 1.25x).  
  DSCR = Cash Flow ÷ Total Annual Debt Service.

- **Debt Service per $1 of Price**  
  The annual loan payment created by each $1 of purchase price, considering:
  - leverage
  - interest rate
  - amortization
  - seller notes (if applicable)

---

## Step-by-Step Math

### Step 1: Maximum Allowable Annual Debt Service

```
Max Debt Service = EBITDA ÷ Target DSCR
```

---

### Step 2: Annual Debt Service per $1 of Loan

```
Debt Service per $1 of Loan = -PMT(Interest Rate, Amortization Years, 1)
```

---

## Case A: SBA Loan Only

```
Max Loan = Max Debt Service ÷ DS per $1
Max Purchase Price = Max Loan ÷ SBA % of Price
```

---

## Case B: SBA Loan + Seller Note

```
Total DS per $1 of Price =
(SBA % × -PMT(SBA Rate, SBA Amort, 1))
+
(Seller % × -PMT(Seller Rate, Seller Amort, 1))
```

```
Max Purchase Price =
(EBITDA ÷ DSCR) ÷ (Total DS per $1 of Price)
```

---

## Final Formula

```
Max Price =
EBITDA ÷ (DSCR × Debt Service per $1 of Purchase Price)
```

---

## Spreadsheet Implementation

```
= EBITDA / (DSCR * Debt_Service_per_$1)
```

---

## Key Takeaway

**DSCR math sets the price ceiling. Multiples are outputs, not inputs.**
