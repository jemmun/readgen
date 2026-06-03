#!/bin/bash

# Quick Build Script - No interactive prompts
# Usage: ./quick-build.sh [android|ios|both|local]

set -e

PLATFORM=${1:-both}

echo "🚀 Building ReadGen app for: $PLATFORM"
echo ""

# Check if in frontend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this from the frontend directory"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check EAS CLI
if ! command -v eas &> /dev/null; then
    echo "📦 Installing EAS CLI..."
    npm install -g eas-cli
fi

case $PLATFORM in
    android)
        echo "🤖 Building Android APK..."
        eas build --platform android --profile preview
        ;;
    ios)
        echo "🍎 Building iOS IPA..."
        eas build --platform ios --profile preview
        ;;
    both)
        echo "📱 Building for both platforms..."
        eas build --platform all --profile preview
        ;;
    local)
        echo "📦 Creating local build..."
        npx expo export --platform all
        echo "✅ Bundle exported to dist/"
        ;;
    *)
        echo "❌ Usage: ./quick-build.sh [android|ios|both|local]"
        exit 1
        ;;
esac

echo ""
echo "✅ Build completed!"
