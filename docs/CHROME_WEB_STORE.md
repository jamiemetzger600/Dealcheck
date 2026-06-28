# Chrome Web Store — Vettr Extension (v4.4.x)

## Before upload

1. **Build the store ZIP**
   ```bash
   chmod +x build-store-package.sh
   ./build-store-package.sh
   ```
   Output: `Vettr-Extension-v4.4.0-store.zip`

2. **Host privacy policy** (required)  
   Publish [`privacy-policy.html`](privacy-policy.html) at a public URL, e.g.  
   `https://vettr.pages.dev/privacy-policy.html`  
   Enter that URL in the Developer Dashboard → Privacy practices.

3. **Production API / web** (already in extension)  
   - Web: `https://vettr.pages.dev`  
   - API: `https://database-vettr-65d5dc25.koyeb.app/api`  
   Set `VITE_EXTENSION_ID` on Cloudflare Pages after you have the **published** extension ID (or unpacked ID for dev).

## Listing copy (suggested)

| Field | Text |
|-------|------|
| **Name** | Find it. Vett it. Save it. |
| **Summary** | Aggregate acquisition deals, analyze with a scenario calculator, and sync saved deals with your Vettr account. |
| **Description** | Vettr helps business buyers find and evaluate acquisition opportunities. Aggregate deals from spreadsheets and sources you configure, filter with your buy box, run SBA-style scenario analysis on listing pages, and save deals to My Deals. Sign in once to sync saved deals with your Vettr account on the web. |
| **Category** | Productivity |
| **Language** | English |

## Permission justifications (for review form)

| Permission | Why |
|------------|-----|
| `storage` / `unlimitedStorage` | Save deals, buy box, and calculator state locally |
| `activeTab` | Inject the deal analyzer on the current listing tab |
| `tabs` | Open/focus the Vettr dashboard; background refresh |
| `alarms` | Optional scheduled deal refresh |
| `notifications` | Optional new-deal alerts |
| `downloads` | Export deal backups |
| `identity` | Optional Google OAuth for private Google Sheets |
| `host_permissions` `https://*/*` | Read listing pages you visit; call Vettr API; fetch configured sheet URLs |

## Single purpose

**Help users find, analyze, and save business acquisition deals.**

## Test instructions for reviewers

1. Load unpacked extension or install from package.
2. Click extension icon → dashboard opens.
3. Open **My Deals** → sign in with a test Vettr account (email/password).
4. Visit a business listing site → open calculator overlay → save a deal.
5. Confirm deal appears under My Deals on https://vettr.pages.dev when signed in as the same user.

## After publish

1. Copy the **extension ID** from `chrome://extensions` (published) or the Chrome Web Store developer dashboard.
2. Set `VITE_EXTENSION_ID=<id>` on Cloudflare Pages and redeploy the web app so website login auto-links the extension.
