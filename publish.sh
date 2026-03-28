#!/bin/bash
# Publish script for tailwind-styled-v4

echo "🚀 Publishing tailwind-styled-v4 to npm..."
echo ""

# Check if logged in
echo "📋 Checking npm login..."
npm whoami || { echo "❌ Not logged in to npm. Run 'npm login' first."; exit 1; }

# Version to publish
VERSION=$(node -p "require('./package.json').version")
echo "📦 Version: $VERSION"

# Confirm
read -p "Publish version $VERSION? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled."
    exit 1
fi

# Build first
echo ""
echo "🔨 Building packages..."
npm run build || { echo "❌ Build failed."; exit 1; }

# Publish
echo ""
echo "📤 Publishing to npm..."
npm publish --access public

echo ""
echo "✅ Published successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Create a release on GitHub"
echo "   2. Post to Twitter/X with demo"
echo "   3. Share with community"
