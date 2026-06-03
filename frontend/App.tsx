import './src/polyfills';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { I18nProvider } from './src/i18n/I18nContext';
import { ReaderSettingsProvider } from './src/contexts/ReaderSettingsContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <ThemeProvider>
          <AuthProvider>
          <ReaderSettingsProvider>
            <PaperProvider>
              <AppNavigator />
              <StatusBar style="auto" />
            </PaperProvider>
          </ReaderSettingsProvider>
        </AuthProvider>
        </ThemeProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
