# 📱 ReadGen Mobile App Build Guide

## 🚀 Quick Start - One-Click Build

### Option 1: Interactive Build Script (Recommended)
```bash
cd frontend
./build-app.sh
```

### Option 2: NPM Scripts
```bash
cd frontend

# Build for both platforms
npm run build:app

# Build Android only
npm run build:android

# Build iOS only
npm run build:ios

# Build both platforms
npm run build:both
```

---

## 📋 Prerequisites

### Required:
- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm** - Comes with Node.js
- **Expo Account** - Free at [expo.dev](https://expo.dev)
- **EAS CLI** - Install with: `npm install -g eas-cli`

### For Android Builds:
- No additional requirements (EAS builds in the cloud)

### For iOS Builds:
- **Apple Developer Account** ($99/year)
- **EAS CLI** configured with Apple credentials

---

## 🔧 Setup Instructions

### Step 1: Install Dependencies
```bash
cd frontend
npm install
```

### Step 2: Setup EAS CLI
```bash
# Install EAS CLI globally
npm run setup:eas

# Or manually:
npm install -g eas-cli
eas login
```

### Step 3: Configure Project
```bash
# Initialize EAS for your project
eas build:configure
```

---

## 📦 Build Options

### 1. Development Build (For Testing)
```bash
eas build --platform android --profile development
eas build --platform ios --profile development
```
- **Use for**: Testing on physical devices
- **Output**: Development client app
- **Distribution**: Internal only

### 2. Preview Build (For Sharing)
```bash
eas build --platform android --profile preview
eas build --platform ios --profile preview
```
- **Use for**: Sharing with team/testers
- **Output**: APK (Android) / IPA (iOS)
- **Distribution**: Internal only

### 3. Production Build (For Stores)
```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```
- **Use for**: Google Play / App Store submission
- **Output**: AAB (Android) / IPA (iOS)
- **Distribution**: Public stores

---

## 🎯 Build Commands Reference

| Command | Description |
|---------|-------------|
| `./build-app.sh` | Interactive build script |
| `npm run build:app` | Same as above |
| `npm run build:android` | Build Android APK |
| `npm run build:ios` | Build iOS IPA |
| `npm run build:both` | Build both platforms |
| `npm run build:local` | Export bundle locally |
| `npm run setup:eas` | Install & login to EAS |

---

## 📱 Installation After Build

### Android (APK):
1. Download the APK from the build link
2. Transfer to your Android device
3. Enable "Install from Unknown Sources"
4. Open the APK file to install

### iOS (IPA):
1. Download the IPA from the build link
2. Options for installation:
   - **TestFlight**: Upload to App Store Connect
   - **Diawi**: Upload to [diawi.com](https://www.diawi.com) for easy sharing
   - **Apple Configurator**: Direct install via USB

---

## 🌐 Cloud Build vs Local Build

### Cloud Build (EAS) - Recommended ✅
**Pros:**
- No need for Android Studio or Xcode
- Builds in Expo's cloud servers
- Works on any OS (Mac, Windows, Linux)
- Consistent build environment

**Cons:**
- Requires internet connection
- Free tier: 30 builds/month
- Paid tier: $29/month for unlimited

### Local Build
**Pros:**
- No build limits
- Works offline
- Faster iteration

**Cons:**
- **Android**: Requires Android Studio
- **iOS**: Requires Mac + Xcode
- Complex setup

---

## 🐛 Troubleshooting

### Build Fails with "EAS CLI not found"
```bash
npm install -g eas-cli
```

### iOS Build Requires Apple Developer Account
```bash
# You need to enroll in Apple Developer Program
# Visit: https://developer.apple.com/programs/
# Cost: $99/year
```

### Android Build Takes Too Long
- Cloud builds typically take 5-15 minutes
- Check build status: `eas build:list`
- View logs: `eas build:logs --id <build-id>`

### "Node.js version 18+ required"
```bash
# Check current version
node -v

# Install Node 18+ using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

---

## 📊 Build Profiles Explained

### `development`
- Development client for testing
- Includes debugging tools
- Not for production use

### `preview` (Default)
- Internal distribution
- APK for easy Android installation
- IPA for TestFlight/iOS testing
- **Best for team sharing**

### `production`
- Optimized for app stores
- AAB for Google Play
- IPA for App Store
- Includes all optimizations

---

## 🔐 Security Best Practices

1. **Never commit credentials**
   - `.eas/build` is in .gitignore
   - Use EAS secrets for sensitive data

2. **Use environment variables**
   ```bash
   eas secret:create --name API_URL --value https://api.readgen.com
   ```

3. **Rotate API keys regularly**
   - Update in EAS dashboard
   - Redeploy after rotation

---

## 📈 Publishing to Stores

### Google Play Store:
```bash
# Build for production
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android
```

### Apple App Store:
```bash
# Build for production
eas build --platform ios --profile production

# Submit to App Store Connect
eas submit --platform ios
```

---

## 💡 Pro Tips

1. **Use preview builds for testing**
   - Faster than production builds
   - Easier to install on devices

2. **Test on real devices**
   - Simulators don't catch all issues
   - Test performance on actual hardware

3. **Keep dependencies updated**
   ```bash
   npm outdated
   npm update
   ```

4. **Use version control**
   - Commit before building
   - Tag releases: `git tag v1.0.0`

5. **Monitor build times**
   - Average: 5-15 minutes
   - If >20 min, check build logs

---

## 📞 Need Help?

- **Expo Docs**: [docs.expo.dev](https://docs.expo.dev/)
- **EAS Build Docs**: [docs.expo.dev/build](https://docs.expo.dev/build/introduction/)
- **Expo Forums**: [forums.expo.dev](https://forums.expo.dev/)
- **Issues**: [GitHub Issues](https://github.com/expo/expo/issues)

---

## 🎉 Success Checklist

- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] EAS CLI installed and logged in
- [ ] Build script runs successfully
- [ ] APK/IPA downloaded from build link
- [ ] App installs on test device
- [ ] App launches without errors

**Once all items are checked, your app is ready to share!** 🚀
