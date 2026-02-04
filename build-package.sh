#!/bin/bash

# Build Deal Analyzer extension package with version in filename
# Usage: ./build-package.sh
# Output: Deal-Analyzer-v2.2.22.zip (version from version.js)

set -e

# Get version from version.js
VERSION=$(grep "const VERSION = " version.js | cut -d"'" -f2)
if [ -z "$VERSION" ]; then
    echo "❌ Error: Could not read version from version.js"
    exit 1
fi

OUTPUT_NAME="Deal-Analyzer-v${VERSION}.zip"
BUILD_DIR="build-temp"

echo "📦 Building Deal Analyzer v${VERSION}..."
echo "   Output: ${OUTPUT_NAME}"
echo ""

# Create temp directory
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy extension files (exclude docs, git, etc.)
cp manifest.json version.js content.js background.js styles.css i18n.js jspdf.min.js "$BUILD_DIR/"
cp deals-dashboard.html deals-dashboard.js generate-pdf.html test.html "$BUILD_DIR/" 2>/dev/null || true
cp icon.png icon-source.png "$BUILD_DIR/" 2>/dev/null || true
cp -r icons scrapers utils "$BUILD_DIR/"
cp -r web "$BUILD_DIR/" 2>/dev/null || true
cp update-version.sh "$BUILD_DIR/" 2>/dev/null || true

# Create zip with version in filename
cd "$BUILD_DIR"
zip -r "../${OUTPUT_NAME}" . -x "*.DS_Store"
cd ..

# Cleanup
rm -rf "$BUILD_DIR"

echo ""
echo "✅ Package created: ${OUTPUT_NAME}"
echo "   Location: $(pwd)/${OUTPUT_NAME}"
echo ""
echo "💡 To install: Extract the zip and load the folder in Chrome (chrome://extensions → Load unpacked)"
echo ""
