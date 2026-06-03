import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Surface, Divider, Chip } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { useReaderSettings } from '../contexts/ReaderSettingsContext';
import { useI18n } from '../i18n/I18nContext';

const FONT_OPTIONS = [
  { label: 'System', value: 'System' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Sans', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Mono', value: 'Consolas, monospace' },
];

const BG_PRESETS = [
  { label: 'Light', bg: '#fafafa', text: '#333333' },
  { label: 'Dark', bg: '#1a1a2e', text: '#e0e0e0' },
  { label: 'Sepia', bg: '#f4ecd8', text: '#5b4636' },
  { label: 'Green', bg: '#e8f5e9', text: '#1b5e20' },
  { label: 'Blue', bg: '#e3f2fd', text: '#0d47a1' },
];

interface Props {
  onClose: () => void;
}

export default function ReaderSettingsPanel({ onClose }: Props) {
  const { t } = useI18n();
  const { settings, updateSettings, resetSettings } = useReaderSettings();

  return (
    <Surface style={styles.container} elevation={4}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="titleMedium" style={styles.header}>
          {t('readingSettings')}
        </Text>

        <Text variant="bodySmall" style={styles.label}>
          {t('fontSize')}: {settings.fontSize}px
        </Text>
        <Slider
          value={settings.fontSize}
          minimumValue={12}
          maximumValue={32}
          step={1}
          onValueChange={(v: number) => updateSettings({ fontSize: v })}
        />

        <Text variant="bodySmall" style={styles.label}>
          {t('lineHeight')}: {settings.lineHeight.toFixed(1)}
        </Text>
        <Slider
          value={settings.lineHeight}
          minimumValue={1.2}
          maximumValue={2.5}
          step={0.1}
          onValueChange={(v: number) => updateSettings({ lineHeight: v })}
        />

        <Text variant="bodySmall" style={styles.label}>
          {t('paragraphSpacing')}: {settings.paragraphSpacing}px
        </Text>
        <Slider
          value={settings.paragraphSpacing}
          minimumValue={0}
          maximumValue={32}
          step={2}
          onValueChange={(v: number) => updateSettings({ paragraphSpacing: v })}
        />

        <Divider style={styles.divider} />

        <Text variant="bodySmall" style={styles.label}>
          {t('fontFamily')}
        </Text>
        <View style={styles.chipRow}>
          {FONT_OPTIONS.map((font) => (
            <Chip
              key={font.value}
              selected={settings.fontFamily === font.value}
              onPress={() => updateSettings({ fontFamily: font.value })}
              style={styles.chip}
            >
              {font.label}
            </Chip>
          ))}
        </View>

        <Divider style={styles.divider} />

        <Text variant="bodySmall" style={styles.label}>
          {t('theme')}
        </Text>
        <View style={styles.chipRow}>
          {BG_PRESETS.map((preset) => (
            <Chip
              key={preset.label}
              selected={settings.backgroundColor === preset.bg}
              onPress={() =>
                updateSettings({
                  backgroundColor: preset.bg,
                  textColor: preset.text,
                })
              }
              style={[styles.chip, { backgroundColor: preset.bg }]}
              textStyle={{ color: preset.text }}
            >
              {preset.label}
            </Chip>
          ))}
        </View>

        <Divider style={styles.divider} />

        <View style={styles.buttonRow}>
          <Button mode="outlined" onPress={resetSettings} style={styles.button}>
            {t('reset')}
          </Button>
          <Button mode="contained" onPress={onClose} style={styles.button}>
            {t('done')}
          </Button>
        </View>
      </ScrollView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '70%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
    color: '#666',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    marginBottom: 4,
  },
  divider: {
    marginVertical: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
  },
});
