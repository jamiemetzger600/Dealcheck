# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview
Chrome Extension (Manifest V3) — "Max Price Deal Analyzer" for business acquisition deal analysis. No build system, no package manager, no bundler. All JS/HTML/CSS is vanilla and loaded directly by Chrome.

### Development Setup
- **No dependencies to install** — all libraries (jsPDF) are vendored.
- Load as an unpacked extension: `chrome://extensions/` → Developer mode → Load unpacked → select `/workspace`.
- The extension dashboard opens when you click the extension icon in the Chrome toolbar.
- Deals are fetched from the Opensheet API (`opensheet.elk.sh`) — requires internet access.

### Linting / Syntax Checking
No ESLint or linter is configured. Use `node --check <file>.js` to validate JavaScript syntax for all source files:
```
for f in version.js i18n.js background.js content.js deals-dashboard.js utils/storage-manager.js utils/custom-source-manager.js scrapers/rss-parser.js; do node --check "$f"; done
```

### Building
`bash build-package.sh` — creates a versioned ZIP (`Deal-Analyzer-v<VERSION>.zip`) for distribution.

### Testing
No automated test framework. Testing is manual via Chrome:
1. Load the unpacked extension in Chrome
2. Open the dashboard by clicking the extension icon
3. Verify deals load (1,300+ listings from default source)
4. Test search/filter, deal details modal, Buy Box configuration, etc.

See `README.md` and `docs/testing/` for detailed test checklists.

### Version Management
- Single source of truth: `version.js` (currently v3.1.1)
- `update-version.sh` propagates version to `manifest.json`
- Note: `update-version.sh` uses macOS-style `sed -i ''` — will need adjustment on Linux

### Key Files
| File | Purpose |
|---|---|
| `manifest.json` | Chrome Extension manifest (entry point) |
| `background.js` | Service worker for alarms, notifications, tabs |
| `content.js` | Content script injected on all pages (~5000+ lines) |
| `deals-dashboard.html` / `deals-dashboard.js` | Standalone dashboard page |
| `utils/storage-manager.js` | Chrome storage abstraction |
| `utils/custom-source-manager.js` | Data source management |
| `scrapers/rss-parser.js` | RSS feed parser |
| `version.js` | Central version string |
