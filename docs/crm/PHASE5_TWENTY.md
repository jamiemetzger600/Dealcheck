# Phase 5 — Twenty (optional / deferred)

Vettr CRM v5 uses a **native** acquisition CRM in the existing stack. The `twenty-main/` folder in this repo is **reference only** — entity models, timeline patterns, kanban UX.

## Decision

- **Do not** embed `twenty-front` or run Twenty as a production sidecar in v5.
- Native Google Calendar + nodemailer cover calendar and email for v5.
- Re-evaluate Twenty only if buyers need **Gmail threading** or advanced workflow automation beyond the native CRM.

## When to reconsider

- Paid users request inbox-level broker email sync inside Vettr.
- Native calendar + task reminders are insufficient after Phase 4 ship.

Until then, Phase 5 is **closed as deferred**.
