---
name: vettr-ui
description: >-
  Vettr product UI design system for the Vettr web app, CRM, dashboard,
  and extension surfaces. Use whenever styling or building UI inside web/,
  extension HTML/CSS, or Vettr CRM components. Do NOT apply Alpine Coast navy/steel
  brand colors to Vettr in-app UI — match existing dark charcoal theme tokens.
---

# Vettr in-app UI

## Scope

Use this skill for **Vettr product surfaces**:

- `web/src/**` (dashboard, CRM, settings, underwriting, portals)
- Chrome extension UI that shares Vettr chrome
- Any component under `web/src/components/crm/`

Do **not** use Alpine Coast Investments navy / soft-steel (`#1a3a50`, `#dde2e7`, `#4a8fa8`) here.

Alpine Coast brand skill applies only to **standalone Alpine Coast artifacts** (investor decks, ACI reports, one-off branded HTML outside Vettr).

## Source of truth

Tokens live in `web/src/styles/global.css` `:root`:

| Token | Value | Use |
|-------|-------|-----|
| `--bg-primary` | `#1a1a1a` | Page background |
| `--bg-secondary` | `#2a2a2a` | Cards, panels, chrome |
| `--bg-tertiary` | `#222222` | Inputs, inset surfaces |
| `--text-primary` | `#e4e4e4` | Body text |
| `--text-secondary` | `#a8a8a8` | Muted / hints |
| `--border` | `#3d3d3d` | Borders, dividers |
| `--primary` | `#c4c4c4` | Soft accent / focus |
| `--brand-from` / `--brand-to` | `#3d3d3d` → `#262626` | Buttons, header chrome |
| `--error` | `#e74c3c` | Errors / P1 |
| `--success` | `#27ae60` | Success |

## Rules

1. **Match neighbors** — New CRM/dashboard UI must look like existing `.crm-*`, `.tab-btn`, `.btn-primary`, `.modal-input` patterns.
2. **CSS variables only** — Prefer `var(--bg-secondary)`, `var(--border)`, etc. No hardcoded light greys (`#fff`, `#dde2e7`) on product chrome.
3. **Inputs** — Dark inset: `background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border)`.
4. **Chips / pills** — Follow `.crm-chip`: translucent white border/fill on dark, not solid navy pills.
5. **Panels** — `background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px`.
6. **No light “form bars”** — Quick-add, filters, and toolbars use the same dark panel treatment as `.crm-today-strip`.
7. **Before shipping UI** — Compare side-by-side with Deal Aggregator tabs and existing CRM kanban; if it looks like a different product, restyle.

## Anti-patterns

- Soft steel / cream / navy Alpine Coast fills inside Vettr
- White input fields on charcoal pages
- Teal (`#4a8fa8`) as primary CTA color in Vettr
- Inventing a second visual system for “new CRM features”
