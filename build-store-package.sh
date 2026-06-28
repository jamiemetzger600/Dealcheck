#!/bin/bash
# Build a Chrome Web Store upload ZIP (extension only — no web app folder).
set -e

VERSION=$(grep "const VERSION = " version.js | cut -d"'" -f2)
if [ -z "$VERSION" ]; then
  echo "❌ Could not read version from version.js"
  exit 1
fi

OUTPUT_NAME="Vettr-Extension-v${VERSION}-store.zip"
BUILD_DIR="build-store-temp"

echo "📦 Building Chrome Web Store package v${VERSION}..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

cp manifest.json version.js content.js background.js styles.css i18n.js jspdf.min.js privacy-policy.html "$BUILD_DIR/"
cp deals-dashboard.html deals-dashboard.js "$BUILD_DIR/" 2>/dev/null || true
cp -r icons scrapers utils "$BUILD_DIR/"

cd "$BUILD_DIR"
zip -r "../${OUTPUT_NAME}" . -x "*.DS_Store"
cd ..
rm -rf "$BUILD_DIR"

echo "✅ Store package: ${OUTPUT_NAME}"
echo "   Privacy policy URL (host after publish): https://vettr.pages.dev/privacy-policy.html"
echo "   Or bundle: extension includes privacy-policy.html — host a public copy for the listing."
