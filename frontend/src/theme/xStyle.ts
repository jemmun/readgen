// Twitter/X Style Design System

export const XColorsLight = {
  primary: '#1d9bf0',
  primaryDark: '#1a8cd8',
  background: '#ffffff',
  surface: '#f7f9f9',
  textPrimary: '#0f1419',
  textSecondary: '#536471',
  border: '#eff3f4',
  error: '#f4212e',
  success: '#00ba7c',
  warning: '#f7931a',
};

export const XColorsDark = {
  primary: '#1d9bf0',
  primaryDark: '#1a8cd8',
  background: '#000000',
  surface: '#16181c',
  textPrimary: '#e7e9ea',
  textSecondary: '#71767b',
  border: '#2f3336',
  error: '#f4212e',
  success: '#00ba7c',
  warning: '#f7931a',
};

export const XColors = XColorsLight;
export type XColorsType = typeof XColorsLight;

export const XTypography = {
  headlineLarge: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  headlineMedium: {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 28,
  },
  titleLarge: {
    fontSize: 17,
    fontWeight: '700' as const,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
};

export const XSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const XBorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const XAvatarSizes = {
  small: 32,
  medium: 40,
  large: 48,
};
