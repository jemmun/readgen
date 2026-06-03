import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { translations, Language, TranslationKey } from './translations';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

const LANGUAGE_STORAGE_KEY = 'app_language';

// Helper to detect system language
function getSystemLanguage(): Language {
  try {
    let languageCode: string | undefined;
    
    if (Platform.OS === 'web') {
      // Browser: use navigator.language
      languageCode = typeof navigator !== 'undefined' ? navigator.language : 'en';
    } else {
      // Mobile: use NativeModules
      const locale =
        (NativeModules.SettingsManager &&
          NativeModules.SettingsManager.settings &&
          NativeModules.SettingsManager.settings.AppleLocale) ||
        (NativeModules.SettingsManager &&
          NativeModules.SettingsManager.settings &&
          NativeModules.SettingsManager.settings.AppleLanguages?.[0]) ||
        (NativeModules.I18nManager && NativeModules.I18nManager.localeIdentifier);
      
      languageCode = locale;
    }
    
    // Parse language code (e.g., 'zh-CN' -> 'zh', 'en-US' -> 'en')
    if (languageCode) {
      const lang = languageCode.split('-')[0].split('_')[0];
      if (lang === 'zh') return 'zh';
    }
    
    return 'en'; // Default to English
  } catch (error) {
    console.error('Failed to detect system language:', error);
    return 'en';
  }
}

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [loaded, setLoaded] = useState(false);

  // Load language preference or detect system language
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        // 1. Check if user has manually set a language preference
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored && (stored === 'en' || stored === 'zh')) {
          setLanguageState(stored as Language);
        } else {
          // 2. Detect system language
          const systemLang = getSystemLanguage();
          setLanguageState(systemLang);
        }
      } catch (error) {
        console.error('Failed to load language:', error);
        setLanguageState('en');
      } finally {
        setLoaded(true);
      }
    };
    loadLanguage();
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    // Persist user's language choice
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (error) {
      console.error('Failed to save language:', error);
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey) => {
      return translations[language][key] || translations.en[key] || key;
    },
    [language]
  );

  if (!loaded) return null; // Prevent flash of wrong language

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
