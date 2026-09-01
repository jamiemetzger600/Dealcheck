---
name: live
description: >-
  Commit current changes and push to remote so work goes live.
  Use when the user invokes /live or says "go live".
disable-model-invocation: true
---

# /live — Commit & Push

Invoking this skill **is** authorization to commit and push. Run the git commands yourself — do not hand the user a checklist.

Do **not** run Koyeb (retired). After push, follow `.cursor/rules/deploy-after-commit.mdc`: Pages auto-deploys the web app; kickstart `com.vettr.api` if `backend/` changed.

## Workflow

1. **Inspect** (parallel):
   - `git status`
   - `git diff` and `git diff --staged`
   - `git log -5 --oneline` (match commit style)

2. **Version** — If app code changed and the patch was not already bumped for these changes, bump **4.1.x** in the usual places (`web/package.json`, and backend files when backend changed). Skip for docs-only / skill-only edits unless the user asked otherwise.

3. **Commit** (if there are changes):
   - Stage relevant files only — never `.env`, credentials, or unrelated junk
   - Commit with a HEREDOC message focused on why
   - If commit fails due to a hook, fix and make a **new** commit (do not amend unless amend rules are fully met)

4. **Push** immediately in the same turn:
   - `git push`, or `git push -u origin HEAD` if no upstream
   - Never force-push `main`/`master`
   - Never `--no-verify` unless the user explicitly asked

5. **Report** briefly: commit SHA/subject, branch, push result (or exact error).

## Edge cases

| Situation | Action |
|-----------|--------|
| Dirty tree | Commit then push |
| Clean tree, branch ahead of remote | Push only |
| Clean and synced | Say nothing to ship; stop |
| Nothing meaningful to commit | Do not create an empty commit |

## Safety

- Never update git config
- Never force-push to `main`/`master` without explicit user request
- Never commit secrets
- Never run `koyeb` (retired). Do not run other deploy CLIs unless the user asks separately, except the LaunchAgent kickstart in deploy-after-commit.
