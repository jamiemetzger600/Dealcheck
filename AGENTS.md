# AGENTS.md

## Cursor Cloud specific instructions

### Project overview
This is a **Chrome Extension** (Manifest V3) called "Max Price Deal Analyzer" — a business acquisition deal analysis platform. It is built with vanilla JavaScript, HTML, and CSS with no package manager, no build step, and no server-side components. The single vendored dependency is `jspdf.min.js`.

### Development environment
- **No dependencies to install.** There is no `package.json`, `requirements.txt`, or any dependency manifest. The extension is entirely self-contained.
- **No build step for development.** The extension files are loaded directly by Chrome.
- The version is managed in `version.js` (single source of truth) and `manifest.json`.

### How to load and test the extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the `/workspace` directory
4. The extension appears in Chrome — click its toolbar icon to open the Deals Dashboard
5. Deals are aggregated from public Google Sheets via the Opensheet API (requires internet)

### Build / Package
- `./build-package.sh` — creates a `Deal-Analyzer-v{version}.zip` for distribution (not needed for development)
- `./update-version.sh <version>` — bumps the version in `version.js` and `manifest.json`

### Key files
| File | Role |
|---|---|
| `manifest.json` | Extension manifest (permissions, content scripts, service worker) |
| `version.js` | Version single source of truth |
| `background.js` | Service worker (icon clicks, alarms, background fetching) |
| `content.js` | Content script injected into all pages (overlay UI, calculators) |
| `deals-dashboard.html` / `deals-dashboard.js` | Full-page deals dashboard |
| `styles.css` | Global CSS for the content script overlay |
| `i18n.js` | Internationalization / currency formatting |
| `scrapers/rss-parser.js` | RSS feed parser |
| `utils/storage-manager.js` | Chrome storage abstraction |
| `utils/custom-source-manager.js` | Custom deal source management |

### Gotchas
- There are **no automated tests or linting** configured in this project. Validation is done manually by loading the extension in Chrome.
- After editing any JS/HTML/CSS file, reload the extension from `chrome://extensions/` (click the refresh icon on the extension card) to pick up changes.
- The `python/` directory contains a standalone Google Sheets parser utility, not part of the extension runtime.
