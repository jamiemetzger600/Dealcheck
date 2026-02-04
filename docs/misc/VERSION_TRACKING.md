# Version Tracking Reference - Deal Aggregator

## Current Version: 2.1.0

This document tracks version increments to ensure consistency across all files.

---

## Version Numbering Strategy

### Format: MAJOR.MINOR.PATCH

**MAJOR (2.x.x):** Platform-level changes
- 2.0.0: Complete platform rewrite (aggregator system)
- 3.0.0: Future major architecture change

**MINOR (x.Y.x):** New features
- 2.1.0: Custom sources + manual entry
- 2.2.0: Expanded scraping (5+ new sources)
- 2.3.0: Buy Box filtering system
- 2.4.0: AI scoring and matching
- 2.5.0: Cloud sync + web dashboard

**PATCH (x.x.Z):** Bug fixes
- 2.1.1: Fix column mapping bug
- 2.1.2: Fix duplicate detection

---

## Files to Update for Every Version Change

### 1. manifest.json
```json
{
  "version": "2.1.0",  ← Update this
  ...
}
```

### 2. deals-dashboard.html
```html
<span class="header-version" id="header-version">v2.1.0</span>  ← Update this
```

### 3. deals-dashboard.js
```javascript
console.log('🚀 Initializing Deal Aggregator v2.1.0');  ← Update this
```

### 4. Create Release Notes
- `RELEASE_NOTES_v2.1.0.md` (for each minor version)
- `CHANGELOG.md` (append to existing)

### 5. Update Documentation Filenames
- Rename versioned guides: `GUIDE_v2.1.0.md`
- Keep generic guides unversioned

---

## Version History

### v2.1.0 - January 25, 2026
**Type:** Minor Feature Release  
**Focus:** Custom Sources & Manual Entry

**Features Added:**
- Google Sheets integration
- CSV file import
- Manual deal entry form
- Source management UI

**Files Changed:**
- manifest.json (version bump)
- deals-dashboard.html (version display, modals)
- deals-dashboard.js (modal handlers)
- utils/custom-source-manager.js (NEW)

**Commits:** 3
- 50c922c: Add custom sources and manual deal entry
- 6644584: Add comprehensive guide
- 824257f: Version increment

---

### v2.0.0 - January 24, 2026
**Type:** Major Platform Release  
**Focus:** Deal Aggregator Foundation (Phase 1)

**Features Added:**
- Journey indicator (Data → Wisdom)
- Tabbed interface (Aggregator + My Deals)
- RSS feed parser (2 sources)
- Storage manager with LRU cache
- Kumo-style table with sorting
- Search and pagination
- Quick actions (save/view deals)

**Files Changed:**
- manifest.json (version 2.0.0, description update)
- deals-dashboard.html (complete redesign)
- deals-dashboard.js (aggregator logic)
- scrapers/rss-parser.js (NEW)
- utils/storage-manager.js (NEW)

**Commits:** 7
- 5cd86a9: Initialize platform
- f90e89d: Add journey and tabs
- 2df502c: Add RSS parser
- eb2c3f3: Complete Phase 1
- c7054be: Add documentation
- fc405b0: Phase 1 summary

---

### v1.9.22 - January 2026 (Before Aggregator)
**Type:** Stable Pre-Aggregator Version  
**Focus:** Single deal analysis

**Features:**
- Deal scenario calculator
- Max price calculation
- Quality scoring
- Deal dashboard (saved deals only)
- PDF export

---

## Quick Reference: Where Versions Appear

| Location | Format | Example |
|----------|--------|---------|
| manifest.json | `"version": "X.Y.Z"` | `"version": "2.1.0"` |
| HTML Display | `vX.Y.Z` | `v2.1.0` |
| JS Console | `vX.Y.Z` | `v2.1.0` |
| Git Commit | `vX.Y.Z: Message` | `v2.1.0: Add feature` |
| Release Notes | `v2.1.0` | `RELEASE_NOTES_v2.1.0.md` |
| Documentation | `vX.Y.Z` (optional) | `GUIDE_v2.1.0.md` |

---

## Git Commit Message Template

```
vX.Y.Z: Brief description of change

Longer explanation if needed.

Features Added:
- Feature 1
- Feature 2

Files Modified:
- file1.js (+X lines)
- file2.html (+Y lines)

Technical Details:
- Detail 1
- Detail 2
```

---

## Pre-Commit Checklist

Before committing a version change:

1. ✅ Update manifest.json version
2. ✅ Update deals-dashboard.html version display
3. ✅ Update deals-dashboard.js console log
4. ✅ Create/update release notes file
5. ✅ Update CHANGELOG.md
6. ✅ Run linter checks
7. ✅ Test in Chrome extension
8. ✅ Commit with version prefix: `vX.Y.Z: Message`
9. ✅ Push to GitHub
10. ✅ Tag release (optional for minor versions)

---

## Next Version Planning

### v2.2.0 (Planned)
**Focus:** Expanded Scraping
- Add BizBen scraper
- Add BizMLS scraper
- Add DealStream scraper
- Add GlobalBX scraper
- Add Hedgestone scraper
- Background auto-sync
- Enhanced duplicate detection

### v2.3.0 (Planned)
**Focus:** Buy Box Filtering
- Range-based filters UI
- Buy box matcher engine
- Filter presets
- Save/load buy box settings
- Match explanations

### v2.4.0 (Planned)
**Focus:** AI & Knowledge
- Client-side ML scoring
- Deal detail modal
- Match explanations
- Smart recommendations
- Learning from user behavior

### v2.5.0 (Planned)
**Focus:** Cloud Sync
- Supabase integration
- Web dashboard (Vercel)
- Cross-device sync
- Mobile access
- Real-time updates

---

## Version Tracking Tools

### Check Current Version
```bash
# From manifest
cat manifest.json | grep version

# From HTML
grep -o "v[0-9]\+\.[0-9]\+\.[0-9]\+" deals-dashboard.html

# From JS
grep -o "v[0-9]\+\.[0-9]\+\.[0-9]\+" deals-dashboard.js
```

### Update All Versions (Manual)
```bash
# Find all version references
grep -r "2\.1\.0" .

# Update manifest
sed -i '' 's/"version": "2.1.0"/"version": "2.2.0"/' manifest.json

# Update HTML
sed -i '' 's/v2.1.0/v2.2.0/' deals-dashboard.html

# Update JS
sed -i '' 's/v2.1.0/v2.2.0/' deals-dashboard.js
```

---

## Notes

- Always increment version for ANY feature addition
- Use PATCH versions for bug fixes only
- Document breaking changes clearly
- Keep version history in this file
- Tag important releases in Git
- Create GitHub releases for major/minor versions

---

**Last Updated:** January 25, 2026  
**Current Version:** v2.1.0  
**Next Planned:** v2.2.0 (Expanded Scraping)
