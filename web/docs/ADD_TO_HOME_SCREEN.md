# Add to Home Screen (PWA)

Vettr installs from the website — no App Store. In the product, open **Get the app** (header menu or Settings → Get the app) for platform-specific steps.

## iOS (Safari)

1. Open Vettr in **Safari** (required)
2. Tap the **Share** button (box with arrow)
3. Tap **Add to Home Screen**
4. Tap **Add**

## Android (Chrome)

1. Open Vettr in Chrome
2. Tap **Install Vettr** in Settings if shown, or menu (⋮) → **Install app** / **Add to Home screen**
3. Confirm

## After install

- Opens full-screen (standalone)
- App shell assets are cached by the service worker for faster loads
- API calls stay network-first (you need connectivity for deals and DD)
- Updates arrive with normal Cloudflare deploys

## Note

HTTPS is required for install prompts and service workers.
