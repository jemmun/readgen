import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { XColorsLight, XColorsDark, XColorsType } from '../theme/xStyle';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'app_theme_mode';
const THEME_COLOR_KEY = 'app_theme_color';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ThemeColor = 'blue' | 'purple' | 'green' | 'orange' | 'red';

export interface ThemePreset {
  name: string;
  icon: string;
  colors: {
    primary: string;
    primaryDark: string;
  };
}

export const THEME_PRESETS: Record<ThemeColor, ThemePreset> = {
  blue: {
    name: 'Ocean Blue',
    icon: '🌊',
    colors: {
      primary: '#1d9bf0',
      primaryDark: '#1a8cd8',
    },
  },
  purple: {
    name: 'Royal Purple',
    icon: '👑',
    colors: {
      primary: '#7c3aed',
      primaryDark: '#6d28d9',
    },
  },
  green: {
    name: 'Forest Green',
    icon: '🌲',
    colors: {
      primary: '#10b981',
      primaryDark: '#059669',
    },
  },
  orange: {
    name: 'Sunset Orange',
    icon: '🌅',
    colors: {
      primary: '#f97316',
      primaryDark: '#ea580c',
    },
  },
  red: {
    name: 'Crimson Red',
    icon: '❤️',
    colors: {
      primary: '#ef4444',
      primaryDark: '#dc2626',
    },
  },
};

interface ThemeContextType {
  isDark: boolean;
  themeMode: ThemeMode;
  themeColor: ThemeColor;
  colors: XColorsType;
  setThemeMode: (mode: ThemeMode) => void;
  setThemeColor: (color: ThemeColor) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  themeMode: 'light',
  themeColor: 'blue',
  colors: XColorsLight,
  setThemeMode: () => {},
  setThemeColor: () => {},
  toggleTheme: () => {},
});

export const useAppTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [themeColor, setThemeColorState] = useState<ThemeColor>('blue');
  const [loaded, setLoaded] = useState(false);

  // Load theme preference from AsyncStorage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const mode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        const color = await AsyncStorage.getItem(THEME_COLOR_KEY);
        
        if (mode && ['light', 'dark', 'auto'].includes(mode)) {
          setThemeModeState(mode as ThemeMode);
        }
        if (color && color in THEME_PRESETS) {
          setThemeColorState(color as ThemeColor);
        }
      } catch (e) {
        console.error('Failed to load theme:', e);
      } finally {
        setLoaded(true);
      }
    };
    loadTheme();
  }, []);

  // Determine if dark mode is active
  const isDark = themeMode === 'dark' || 
    (themeMode === 'auto' && new Date().getHours() >= 20 || new Date().getHours() < 7);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.error('Failed to save theme mode:', e);
    }
  };

  const setThemeColor = async (color: ThemeColor) => {
    setThemeColorState(color);
    try {
      await AsyncStorage.setItem(THEME_COLOR_KEY, color);
    } catch (e) {
      console.error('Failed to save theme color:', e);
    }
  };

  const toggleTheme = async () => {
    const newMode = isDark ? 'light' : 'dark';
    await setThemeMode(newMode);
  };
  
  // Generate colors based on theme mode and color preset
  const baseColors = isDark ? XColorsDark : XColorsLight;
  const preset = THEME_PRESETS[themeColor];
  const colors: XColorsType = {
    ...baseColors,
    primary: preset.colors.primary,
    primaryDark: preset.colors.primaryDark,
  };

  if (!loaded) return null; // Prevent flash of wrong theme

  return (
    <ThemeContext.Provider value={{ 
      isDark, 
      themeMode,
      themeColor,
      colors, 
      setThemeMode,
      setThemeColor,
      toggleTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}
