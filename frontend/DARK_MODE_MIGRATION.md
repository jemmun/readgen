# Dark Mode Migration Guide

## Overview

This guide explains how to migrate screens from static `XColors` to dynamic theme-aware colors that support dark mode.

## The Challenge

React Native's `StyleSheet.create()` is static - it's evaluated once when the module loads. This means:

```typescript
// ❌ WRONG - Static, won't update with theme changes
const styles = StyleSheet.create({
  container: {
    backgroundColor: XColors.background, // Always light mode color
  }
});
```

## Solutions

### Option 1: Use Inline Styles (Recommended for simple cases)

```typescript
import { useThemeColors } from '../hooks/useThemeColors';

export default function MyScreen() {
  const colors = useThemeColors();
  
  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <Text style={{ color: colors.textPrimary }}>Hello</Text>
    </View>
  );
}
```

**Pros:** Simple, reactive, works everywhere
**Cons:** Can't reuse styles, less performant for complex screens

### Option 2: Style Function Pattern (Recommended for complex screens)

```typescript
import { useThemeColors } from '../hooks/useThemeColors';
import { StyleSheet, View } from 'react-native';

export default function MyScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello</Text>
    </View>
  );
}

function createStyles(colors: XColorsType) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
  });
}
```

**Pros:** Reactive, organized, can reuse style logic
**Cons:** Styles recreated on every render (useMemo can help)

### Option 3: useMemo Optimization

```typescript
import { useMemo } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';

export default function MyScreen() {
  const colors = useThemeColors();
  
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  }), [colors]);
  
  return <View style={styles.container} />;
}
```

**Pros:** Performant, only recreates when theme changes
**Cons:** Slightly more complex

## Migration Steps

### Step 1: Import the Hook

```typescript
// Remove or keep for non-color constants
import { XTypography, XSpacing, XBorderRadius } from '../theme/xStyle';

// Add theme hook
import { useThemeColors } from '../hooks/useThemeColors';
```

### Step 2: Use the Hook in Component

```typescript
export default function MyScreen() {
  const colors = useThemeColors();
  // ... rest of component
}
```

### Step 3: Update Style References

**Before:**
```typescript
backgroundColor: XColors.background
color: XColors.textPrimary
borderColor: XColors.border
```

**After:**
```typescript
backgroundColor: colors.background
color: colors.textPrimary
borderColor: colors.border
```

### Step 4: Choose Your Pattern

- **Simple screens (<50 lines):** Inline styles
- **Complex screens:** Style function + useMemo
- **Shared components:** Style function passed as prop

## Available Theme Colors

```typescript
interface XColorsType {
  primary: string;           // Primary blue
  background: string;        // Screen background
  surface: string;           // Card/surface background
  textPrimary: string;       // Main text
  textSecondary: string;     // Secondary text
  textLight: string;         // Light/muted text
  border: string;            // Borders and dividers
  error: string;             // Error state
  success: string;           // Success state
  warning: string;           // Warning state
  avatar: string;            // Avatar backgrounds
  gradientStart: string;     // Gradient start
  gradientEnd: string;       // Gradient end
}
```

## Constants That Don't Change

These can still be imported statically:

```typescript
import { XTypography, XSpacing, XBorderRadius, XAvatarSizes } from '../theme/xStyle';

// These are theme-agnostic and safe to use in StyleSheet.create()
XTypography.headlineSmall
XSpacing.md
XBorderRadius.md
XAvatarSizes.lg
```

## Example: Complete Migration

### Before (Static Light Mode)

```typescript
import { XColors, XTypography, XSpacing } from '../theme/xStyle';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: XColors.background,
    padding: XSpacing.lg,
  },
  card: {
    backgroundColor: XColors.surface,
    borderRadius: XBorderRadius.md,
    padding: XSpacing.md,
  },
  title: {
    ...XTypography.headlineSmall,
    color: XColors.textPrimary,
  },
});
```

### After (Theme-Aware Dark Mode)

```typescript
import { useThemeColors } from '../hooks/useThemeColors';
import { XTypography, XSpacing, XBorderRadius } from '../theme/xStyle';

export default function MyScreen() {
  const colors = useThemeColors();
  
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: XSpacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: XBorderRadius.md,
      padding: XSpacing.md,
    },
    title: {
      ...XTypography.headlineSmall,
      color: colors.textPrimary,
    },
  }), [colors]);
  
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Title</Text>
      </View>
    </View>
  );
}
```

## Testing Dark Mode

1. Go to Settings screen
2. Toggle "Dark Mode" switch
3. Navigate through app to verify colors change
4. Check all screens for proper contrast

## Priority Screens to Migrate

### High Priority (User-Facing)
- [ ] HomeScreen
- [ ] ReaderScreen
- [ ] PostDetailScreen
- [ ] MessagesScreen
- [ ] UserProfileScreen

### Medium Priority
- [ ] IdeasScreen
- [ ] LibraryScreen
- [ ] NovelDetailScreen
- [ ] SettingsScreen

### Low Priority (Can use light mode only)
- [ ] LoginScreen
- [ ] RegisterScreen
- [ ] QRScannerScreen

## Tools & Utilities

- `useThemeColors()` - Get current theme colors
- `useTheme()` - Get full theme context (isDark, colors, toggleTheme)
- `XColorsLight` - Light mode colors (for reference)
- `XColorsDark` - Dark mode colors (for reference)

## Notes

- Theme preference is persisted in AsyncStorage
- Theme changes are reactive across the app
- Consider adding a loading state during theme switch
- Test on both iOS and Android for consistency
