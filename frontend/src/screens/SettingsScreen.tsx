import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Switch } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useI18n } from '../i18n/I18nContext';
import { useAppTheme } from '../contexts/ThemeContext';
import { XTypography, XSpacing, XBorderRadius, XColorsType } from '../theme/xStyle';

export default function SettingsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { t, language, setLanguage } = useI18n();
  const { isDark, themeMode, themeColor, colors, setThemeMode, setThemeColor, toggleTheme } = useAppTheme();
  
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {t('settings')}
        </Text>
      </View>

      {/* Settings Sections */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('appearance')}</Text>
          
          {/* Theme Mode */}
          <Text style={styles.subsectionHeader}>Theme Mode</Text>
          <View style={styles.themeModeRow}>
            {[
              { key: 'light', label: 'Light', icon: '☀️' },
              { key: 'dark', label: 'Dark', icon: '🌙' },
              { key: 'auto', label: 'Auto', icon: '🔄' },
            ].map((mode) => (
              <TouchableOpacity
                key={mode.key}
                style={[
                  styles.themeModeBtn,
                  themeMode === mode.key && styles.themeModeBtnActive,
                ]}
                onPress={() => setThemeMode(mode.key as any)}
              >
                <Text style={styles.themeModeIcon}>{mode.icon}</Text>
                <Text style={[
                  styles.themeModeLabel,
                  themeMode === mode.key && styles.themeModeLabelActive,
                ]}>
                  {mode.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Theme Color */}
          <Text style={styles.subsectionHeader}>Accent Color</Text>
          <View style={styles.colorGrid}>
            {[
              { key: 'blue', icon: '🌊', name: 'Ocean' },
              { key: 'purple', icon: '👑', name: 'Royal' },
              { key: 'green', icon: '🌲', name: 'Forest' },
              { key: 'orange', icon: '🌅', name: 'Sunset' },
              { key: 'red', icon: '❤️', name: 'Crimson' },
            ].map((color) => (
              <TouchableOpacity
                key={color.key}
                style={[
                  styles.colorBtn,
                  themeColor === color.key && styles.colorBtnActive,
                ]}
                onPress={() => setThemeColor(color.key as any)}
              >
                <View style={[
                  styles.colorCircle,
                  { backgroundColor: colors.primary },
                  themeColor === color.key && styles.colorCircleActive,
                ]} />
                <Text style={styles.colorIcon}>{color.icon}</Text>
                <Text style={styles.colorName}>{color.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Language Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('language')}</Text>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setLanguage('en')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>English</Text>
              <Text style={styles.settingDescription}>Use English for all UI text</Text>
            </View>
            <Text style={[styles.radio, language === 'en' && styles.radioActive]}>
              {language === 'en' ? '●' : '○'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setLanguage('zh')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>中文</Text>
              <Text style={styles.settingDescription}>使用中文作为界面语言</Text>
            </View>
            <Text style={[styles.radio, language === 'zh' && styles.radioActive]}>
              {language === 'zh' ? '●' : '○'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('accountSettings')}</Text>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>Change Password</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('MyQRCode')}
          >
            <Text style={styles.settingLabel}>My QR Code</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('Messages')}
          >
            <Text style={styles.settingLabel}>Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Text style={styles.settingLabel}>Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('Feedback')}
          >
            <Text style={styles.settingLabel}>Send Feedback</Text>
          </TouchableOpacity>
        </View>

        {/* AI Provider Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('aiProvider')}</Text>
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>API Configuration</Text>
              <Text style={styles.settingDescription}>Manage your AI provider settings</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>{t('about')}</Text>
          <Text style={styles.versionText}>
            {t('version')} 1.0.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: XColorsType) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: XSpacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      ...XTypography.headlineMedium,
      color: colors.textPrimary,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    section: {
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    sectionHeader: {
      ...XTypography.bodySmall,
      color: colors.textSecondary,
      fontWeight: '600',
      paddingHorizontal: XSpacing.lg,
      paddingVertical: XSpacing.sm,
      backgroundColor: colors.surface,
    },
    subsectionHeader: {
      ...XTypography.bodyMedium,
      color: colors.textPrimary,
      fontWeight: '600',
      paddingHorizontal: XSpacing.lg,
      paddingVertical: XSpacing.md,
    },
    // Theme Mode
    themeModeRow: {
      flexDirection: 'row',
      paddingHorizontal: XSpacing.lg,
      paddingBottom: XSpacing.md,
      gap: XSpacing.md,
    },
    themeModeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: XSpacing.md,
      borderRadius: XBorderRadius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: XSpacing.xs,
    },
    themeModeBtnActive: {
      backgroundColor: `${colors.primary}15`,
      borderColor: colors.primary,
    },
    themeModeIcon: {
      fontSize: 18,
    },
    themeModeLabel: {
      ...XTypography.bodyMedium,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    themeModeLabelActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    // Theme Color
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: XSpacing.lg,
      paddingBottom: XSpacing.lg,
      gap: XSpacing.md,
    },
    colorBtn: {
      width: '18%',
      minWidth: 60,
      alignItems: 'center',
      padding: XSpacing.sm,
      borderRadius: XBorderRadius.lg,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorBtnActive: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}10`,
    },
    colorCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      marginBottom: XSpacing.xs,
      borderWidth: 2,
      borderColor: colors.background,
    },
    colorCircleActive: {
      borderColor: colors.primary,
      borderWidth: 3,
    },
    colorIcon: {
      fontSize: 16,
      marginBottom: XSpacing.xs,
    },
    colorName: {
      ...XTypography.bodySmall,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: XSpacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingInfo: {
      flex: 1,
    },
    settingLabel: {
      ...XTypography.bodyLarge,
      color: colors.textPrimary,
    },
    settingDescription: {
      ...XTypography.bodySmall,
      color: colors.textSecondary,
      marginTop: XSpacing.xs,
    },
    switchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    switchLabel: {
      ...XTypography.bodySmall,
      color: colors.textSecondary,
      marginRight: XSpacing.sm,
    },
    radio: {
      fontSize: 20,
      color: colors.textSecondary,
    },
    radioActive: {
      color: colors.primary,
    },
    aboutSection: {
      padding: XSpacing.xxl,
      alignItems: 'center',
      marginTop: XSpacing.xl,
    },
    aboutTitle: {
      ...XTypography.titleLarge,
      color: colors.textPrimary,
      fontWeight: '700',
    },
    versionText: {
      ...XTypography.bodySmall,
      marginTop: XSpacing.sm,
      color: colors.textSecondary,
    },
  });
}
