#!/bin/bash

# ReadGen Mobile App Build Script
# Builds the Expo app for both Android and iOS platforms

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   ReadGen Mobile App Build Script         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run this script from the frontend directory.${NC}"
    exit 1
fi

# Function to print section headers
print_header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+${NC}"
        exit 1
    fi
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}❌ Node.js version 18+ is required. Current: $(node -v)${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Node.js: $(node -v)${NC}"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ npm: $(npm -v)${NC}"
    
    # Check Expo CLI
    if ! command -v expo &> /dev/null; then
        echo -e "${YELLOW}⚠️  Expo CLI not found globally. Installing...${NC}"
        npm install -g expo-cli
    fi
    echo -e "${GREEN}✅ Expo CLI: $(expo --version)${NC}"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠️  node_modules not found. Running npm install...${NC}"
        npm install
    fi
    
    echo -e "${GREEN}✅ All prerequisites met${NC}"
}

# Function to install dependencies
install_dependencies() {
    print_header "Installing Dependencies"
    
    echo -e "${YELLOW}Installing npm dependencies...${NC}"
    npm install
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
    else
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        exit 1
    fi
}

# Function to run linting and type checking
run_checks() {
    print_header "Running Code Checks"
    
    echo -e "${YELLOW}Running TypeScript check...${NC}"
    if npm run type-check 2>/dev/null || npx tsc --noEmit 2>/dev/null; then
        echo -e "${GREEN}✅ TypeScript check passed${NC}"
    else
        echo -e "${YELLOW}⚠️  TypeScript warnings found (continuing build)${NC}"
    fi
    
    echo -e "${YELLOW}Running ESLint...${NC}"
    if npm run lint 2>/dev/null; then
        echo -e "${GREEN}✅ ESLint passed${NC}"
    else
        echo -e "${YELLOW}⚠️  ESLint warnings found (continuing build)${NC}"
    fi
}

# Function to build for Android
build_android() {
    print_header "Building Android App"
    
    echo -e "${YELLOW}Creating Android build...${NC}"
    echo -e "${BLUE}This may take 5-15 minutes depending on your system${NC}"
    
    # Build APK (easier to distribute)
    echo -e "${YELLOW}Building APK...${NC}"
    npx expo export:embed --platform android --dev false --bundle-output /tmp/android-bundle.js 2>/dev/null || true
    
    # EAS Build for Android
    if command -v eas &> /dev/null; then
        echo -e "${YELLOW}Starting EAS Build for Android APK...${NC}"
        eas build --platform android --profile preview --non-interactive
    else
        echo -e "${YELLOW}EAS CLI not installed. Installing...${NC}"
        npm install -g eas-cli
        echo -e "${YELLOW}Starting EAS Build for Android APK...${NC}"
        eas build --platform android --profile preview --non-interactive
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Android build completed successfully${NC}"
        echo -e "${BLUE}📱 Download link will be provided in the output above${NC}"
    else
        echo -e "${RED}❌ Android build failed${NC}"
        return 1
    fi
}

# Function to build for iOS
build_ios() {
    print_header "Building iOS App"
    
    echo -e "${YELLOW}Creating iOS build...${NC}"
    echo -e "${BLUE}This may take 10-20 minutes${NC}"
    echo -e "${YELLOW}Note: iOS builds require an Apple Developer account${NC}"
    
    # EAS Build for iOS
    if command -v eas &> /dev/null; then
        echo -e "${YELLOW}Starting EAS Build for iOS...${NC}"
        eas build --platform ios --profile preview --non-interactive
    else
        echo -e "${RED}❌ EAS CLI is required for iOS builds${NC}"
        echo -e "${YELLOW}Install with: npm install -g eas-cli${NC}"
        return 1
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ iOS build completed successfully${NC}"
        echo -e "${BLUE}📱 Download link will be provided in the output above${NC}"
    else
        echo -e "${RED}❌ iOS build failed${NC}"
        return 1
    fi
}

# Function to build both platforms
build_both() {
    print_header "Building for Both Android & iOS"
    
    # Build Android
    build_android
    ANDROID_STATUS=$?
    
    # Build iOS
    build_ios
    IOS_STATUS=$?
    
    print_header "Build Summary"
    if [ $ANDROID_STATUS -eq 0 ]; then
        echo -e "${GREEN}✅ Android: SUCCESS${NC}"
    else
        echo -e "${RED}❌ Android: FAILED${NC}"
    fi
    
    if [ $IOS_STATUS -eq 0 ]; then
        echo -e "${GREEN}✅ iOS: SUCCESS${NC}"
    else
        echo -e "${RED}❌ iOS: FAILED${NC}"
    fi
    
    if [ $ANDROID_STATUS -eq 0 ] && [ $IOS_STATUS -eq 0 ]; then
        echo ""
        echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║   🎉 Both platforms built successfully!  ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
    else
        echo ""
        echo -e "${YELLOW}╔════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║   ⚠️  Some builds failed. Check logs above ║${NC}"
        echo -e "${YELLOW}╚════════════════════════════════════════════╝${NC}"
    fi
}

# Function to create local builds (for testing without EAS)
build_local() {
    print_header "Creating Local Build (No EAS)"
    
    echo -e "${YELLOW}Creating local development build...${NC}"
    
    # Export the bundle
    echo -e "${YELLOW}Exporting JavaScript bundle...${NC}"
    npx expo export --platform all
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Bundle exported to dist/ directory${NC}"
        echo -e "${BLUE}You can now use these files with your own build system${NC}"
    else
        echo -e "${RED}❌ Export failed${NC}"
        exit 1
    fi
}

# Main script logic
main() {
    echo ""
    echo "Select build type:"
    echo "  1) Build Android only (APK)"
    echo "  2) Build iOS only (IPA)"
    echo "  3) Build Both Android & iOS"
    echo "  4) Local build only (no EAS, for testing)"
    echo "  5) Quick build (skip checks, build both)"
    echo ""
    read -p "Enter choice (1-5): " choice
    
    case $choice in
        1)
            check_prerequisites
            build_android
            ;;
        2)
            check_prerequisites
            build_ios
            ;;
        3)
            check_prerequisites
            build_both
            ;;
        4)
            check_prerequisites
            build_local
            ;;
        5)
            echo -e "${YELLOW}⚡ Quick build mode - skipping checks${NC}"
            install_dependencies
            build_both
            ;;
        *)
            echo -e "${RED}❌ Invalid choice${NC}"
            exit 1
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}✅ Build process completed!${NC}"
    echo ""
}

# Run main function
main
