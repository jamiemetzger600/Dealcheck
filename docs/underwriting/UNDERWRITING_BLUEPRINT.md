# Vettr Underwriting Blueprint (Milestone 2 — SOIL-first)

## Purpose

Speed up the day-to-day B-SOIL underwriting loop inside Vettr: one workbook per CRM deal, **standalone / pop-out** for long sessions, DD-linked trustworthy inputs, structure-path seller financing, operating scenarios, and share packs for banks / investors / advisors.

Primary reference workbook: `B-SOIL.xlsx` (Quick Underwrite, P&L YoY with tax-return cross-check, Baseline/Optimistic projections, Exec Summary, ROI waterfalls, Amortization).

## Operator workflow we are optimizing

1. Pull deal financials into historicals; cross-check vs tax returns (trust).
2. Set purchase price + capital stack (equity / SBA / seller) + rates/terms.
3. Project revenue/EBITDA; stress Base / Optimistic / Downside.
4. Structure seller note variants (amort / IO / standby / balloon) and compare.
5. Review investor + sponsor waterfall / exit multiples.
6. Share exec summary / bank one-pager / live link — without re-building Excel tabs.

## SOIL sheet → Vettr surface map

| SOIL | Vettr |
|------|--------|
| Quick Underwrite | Primary standalone page (daily driver) |
| P&L YoY (+ tax return columns) | Historials + evidence / validation |
| Profit & Loss (line detail) | Expert historical detail |
| Baseline / Optimistic projections | Operating scenarios |
| Monthly breakout + Dashboard | Optional Y1 monthly DSCR module |
| Executive Summary | Print / share output |
| ROI-Investor / ROI-ACI | Returns tab + investor pack |
| Amortization | Engine-owned correct schedules (do not copy SOIL amort bugs) |

## Canonical rules (unchanged intent, stricter implementation)

- **DSCR** = Adj. EBITDA ÷ (SBA + seller debt service that counts); standby seller excluded while on standby.
- Preferred return **accrues** unpaid balance; exit EV − residual debt − exit costs → equity split.
- Monthly PMT × 12 for annual debt service; amort balances to $0 at term.
- Provenance on material inputs: `source`, `verified`, evidence link.
- Structure paths vs operating scenarios remain two layers.
- Custom sheets additive only; explicit mappings into engine.

## M1 scaffold vs M2

M1 left schema + engine + thin CRM panel. M2 rebuilds the product around SOIL Quick Underwrite + standalone shell. See `.cursor/plans/vettr_underwriting_tool_47e771a3.plan.md`.

## Roadmap

| Slice | Scope |
|-------|--------|
| M2a | Standalone app + CRM pop-out + hub |
| M2b | Quick Underwrite parity (10yr table, live KPIs) |
| M2c | Historials + tax check + bidirectional DD |
| M2d | Structure-path comparison (seller financing workshop) |
| M2e | Scenarios + correct amort (+ optional monthly DSCR) |
| M2f | Exec / bank / investor outputs + live links |
| M2g | B-SOIL XLSX import + mapping review |
| Later | Tax OCR, document diffs, investor deck, sheet templates |
