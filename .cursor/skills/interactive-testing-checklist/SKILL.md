---
name: interactive-testing-checklist
description: >-
  Create an interactive user testing checklist after finishing a multi-step
  feature or bugfix. Use when work is complete and the user needs to test
  methodically, check off items, and report results accurately. Also use when
  the user asks for a testing checklist, test plan, or QA steps.
---

# Interactive Testing Checklist

After completing a multi-change task (feature, fix, or refactor), **always** end with an interactive testing checklist the user can check off and discuss.

Do this even if the user did not ask — the project expects it for multi-step work.

## When to produce

- Feature or UI work that touches more than one flow
- Bug fixes that need verification across states (guest/signed-in, admin/user, empty/error)
- After saying “ready for you to test” / “please test”

Skip only for trivial one-line edits with an obvious single check.

## Format (required)

Use a markdown checklist the user can copy or tick in chat:

```markdown
## Interactive testing checklist

**Build / version:** <version if bumped>
**Where:** <local URLs, e.g. http://localhost:5173>

### Setup
- [ ] …

### Happy path
- [ ] …

### Edge cases / permissions
- [ ] …

### Report back
For anything that fails, note: **step #**, what you expected, what happened, and a screenshot if useful.
```

## Rules

1. **Methodical** — ordered steps a human can follow without guessing
2. **Checkable** — every item starts with `- [ ]`
3. **Concrete** — name the UI control, route, or expected status text
4. **Include negatives** — guest blocked, non-admin 403, oversize upload, etc. when relevant
5. **No fluff** — only steps that validate this change
6. **Report prompt** — end with how to report failures accurately

## Anti-patterns

- Vague items (“test feedback works”)
- Dumping internal implementation steps the user cannot see
- Skipping permission / guest / admin cases when those were in scope
