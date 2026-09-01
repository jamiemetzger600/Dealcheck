#!/bin/bash

# Version Update Script for Vettr Extension
# Usage: ./update-version.sh <new_version>
# Example: ./update-version.sh 2.2.1

set -e

if [ -z "$1" ]; then
    echo "❌ Error: Version number required"
    echo "Usage: ./update-version.sh <version>"
    echo "Example: ./update-version.sh 2.2.1"
    exit 1
fi

NEW_VERSION="$1"

# Validate version format (x.y.z)
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "❌ Error: Invalid version format. Use x.y.z (e.g., 2.2.1)"
    exit 1
fi

echo "🔄 Updating version to $NEW_VERSION..."

# 1. Update version.js (single source of truth)
echo "📝 Updating version.js..."
sed -i '' "s/const VERSION = '[0-9.]*'/const VERSION = '$NEW_VERSION'/" version.js

# 2. Update manifest.json
echo "📝 Updating manifest.json..."
sed -i '' "s/\"version\": \"[0-9.]*\"/\"version\": \"$NEW_VERSION\"/" manifest.json

# 3. Verify changes
echo ""
echo "✅ Version updated to $NEW_VERSION in:"
echo "   - version.js"
echo "   - manifest.json"
echo ""
echo "📋 Files that automatically use the central version:"
echo "   - content.js (via window.EXTENSION_VERSION)"
echo "   - deals-dashboard.js (via window.EXTENSION_VERSION)"
echo ""

# 4. Show the changes
echo "📊 Current version in files:"
echo "   version.js:    $(grep "const VERSION = " version.js | cut -d"'" -f2)"
echo "   manifest.json: $(grep '"version"' manifest.json | cut -d'"' -f4)"
echo ""

# 5. Prompt for git commit
read -p "Would you like to create a git commit? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add version.js manifest.json
    git commit -m "Bump version to v$NEW_VERSION"
    echo "✅ Git commit created: 'Bump version to v$NEW_VERSION'"
    echo ""
    echo "💡 Next steps:"
    echo "   1. Test the extension by reloading it in Chrome"
    echo "   2. Verify version displays correctly in all locations"
    echo "   3. Create release notes if needed"
    echo "   4. Push changes: git push"
else
    echo "⏩ Skipping git commit. Don't forget to commit manually!"
fi

echo ""
echo "🎉 Done!"
