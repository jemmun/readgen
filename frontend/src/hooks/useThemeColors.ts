/**
 * useThemeColors Hook
 * 
 * This hook provides access to theme-aware colors.
 * Use this instead of importing static XColors directly.
 * 
 * Usage:
 *   const colors = useThemeColors();
 *   <View style={{ backgroundColor: colors.background }} />
 * 
 * Migration Guide:
 *   Before: import { XColors } from '../theme/xStyle';
 *           backgroundColor: XColors.background
 *   
 *   After:  const colors = useThemeColors();
 *           backgroundColor: colors.background
 */

import { useAppTheme } from '../contexts/ThemeContext';

export function useThemeColors() {
  const { colors } = useAppTheme();
  return colors;
}

/**
 * useTheme Hook
 * 
 * Provides full theme context including isDark and toggleTheme.
 * 
 * Usage:
 *   const { isDark, colors, toggleTheme } = useTheme();
 */
export function useTheme() {
  return useAppTheme();
}
