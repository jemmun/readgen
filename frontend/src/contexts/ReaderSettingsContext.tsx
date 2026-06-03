import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ReaderSettings {
  fontSize: number;
  fontFamily: string;
  backgroundColor: string;
  textColor: string;
  lineHeight: number;
  paragraphSpacing: number;
}

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18,
  fontFamily: 'System',
  backgroundColor: '#fafafa',
  textColor: '#333333',
  lineHeight: 1.8,
  paragraphSpacing: 16,
};

const STORAGE_KEY = '@reader_settings';

interface ReaderSettingsContextType {
  settings: ReaderSettings;
  updateSettings: (partial: Partial<ReaderSettings>) => void;
  resetSettings: () => void;
}

const ReaderSettingsContext = createContext<ReaderSettingsContextType>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  resetSettings: () => {},
});

export function ReaderSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json: string | null) => {
        if (json) {
          try {
            const parsed = JSON.parse(json);
            setSettings({ ...DEFAULT_SETTINGS, ...parsed });
          } catch {
            // ignore parse error
          }
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  }, [settings, loaded]);

  const updateSettings = useCallback((partial: Partial<ReaderSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return (
    <ReaderSettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </ReaderSettingsContext.Provider>
  );
}

export function useReaderSettings() {
  return useContext(ReaderSettingsContext);
}
