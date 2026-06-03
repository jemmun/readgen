import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useI18n } from '../i18n/I18nContext';
import { XColors, XTypography, XSpacing, XBorderRadius } from '../theme/xStyle';
import { illustrationsApi, Illustration } from '../api/illustrations';

type IllustrationCreateNavProp = StackNavigationProp<RootStackParamList, 'IllustrationCreate'>;

export default function IllustrationCreateScreen({ navigation }: { navigation: IllustrationCreateNavProp }) {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('realistic');
  const [size, setSize] = useState('1024x1024');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<Illustration | null>(null);
  const [error, setError] = useState('');
  const [illustrationType, setIllustrationType] = useState('illustration');

  const styles_list = [
    { key: 'realistic', label: t('realistic') },
    { key: 'anime', label: t('anime') },
    { key: 'watercolor', label: t('watercolor') },
    { key: 'oilPainting', label: t('oilPainting') },
    { key: 'pixelArt', label: t('pixelArt') },
  ];

  const sizes_list = [
    { key: '1024x1024', label: 'Square' },
    { key: '1024x1792', label: 'Portrait' },
    { key: '1792x1024', label: 'Landscape' },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError('');
    setResult(null);
    try {
      const res = await illustrationsApi.create({ prompt, style, size, illustration_type: illustrationType });
      setResult(res.data);
    } catch (err: any) {
      console.error('[IllustrationCreate] generation failed:', err);
      setError(err.response?.data?.detail || 'Failed to generate illustration');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {t('createIllustration')}
      </Text>

      <TextInput
        label={t('prompt')}
        placeholder={t('promptPlaceholder')}
        value={prompt}
        onChangeText={setPrompt}
        multiline
        numberOfLines={4}
        style={styles.input}
        mode="outlined"
        outlineColor={XColors.border}
        activeOutlineColor={XColors.primary}
        textColor={XColors.textPrimary}
      />

      <Text style={styles.sectionTitle}>
        {t('artStyle')}
      </Text>
      <View style={styles.chipContainer}>
        {styles_list.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.chip, style === s.key && styles.chipSelected]}
            onPress={() => setStyle(s.key)}
          >
            <Text style={[styles.chipText, style === s.key && styles.chipTextSelected]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>
        {t('illustrationType')}
      </Text>
      <View style={styles.chipContainer}>
        <TouchableOpacity
          style={[styles.chip, illustrationType === 'illustration' && styles.chipSelected]}
          onPress={() => setIllustrationType('illustration')}
        >
          <Text style={[styles.chipText, illustrationType === 'illustration' && styles.chipTextSelected]}>
            {t('illustration')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, illustrationType === 'cover' && styles.chipSelected]}
          onPress={() => setIllustrationType('cover')}
        >
          <Text style={[styles.chipText, illustrationType === 'cover' && styles.chipTextSelected]}>
            {t('cover')}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>
        Size
      </Text>
      <View style={styles.chipContainer}>
        {sizes_list.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.chip, size === s.key && styles.chipSelected]}
            onPress={() => setSize(s.key)}
          >
            <Text style={[styles.chipText, size === s.key && styles.chipTextSelected]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, (generating || !prompt.trim()) && styles.buttonDisabled]}
        onPress={handleGenerate}
        disabled={generating || !prompt.trim()}
        activeOpacity={0.8}
      >
        {generating ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>
            {generating ? t('generating') || 'Generating...' : t('generateImage')}
          </Text>
        )}
      </TouchableOpacity>

      {generating && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={XColors.primary} />
          <Text style={styles.loadingText}>
                        {t('generating')}
          </Text>
        </View>
      )}

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {result && result.image_url && (
        <View style={styles.resultContainer}>
                    <Text style={styles.resultTitle}>{t('generationComplete')}</Text>
          <Image
            source={{ uri: `http://localhost:8000${result.image_url}` }}
            style={styles.resultImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.createAnotherButton}
            onPress={() => {
              setResult(null);
              setPrompt('');
            }}
          >
                        <Text style={styles.createAnotherText}>{t('createIllustration')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: XSpacing.lg,
    backgroundColor: XColors.background,
    paddingBottom: 100,
  },
  title: {
    ...XTypography.headlineMedium,
    color: XColors.textPrimary,
    marginBottom: XSpacing.xl,
  },
  input: {
    marginBottom: XSpacing.xl,
    backgroundColor: XColors.background,
  },
  sectionTitle: {
    ...XTypography.titleLarge,
    color: XColors.textPrimary,
    fontWeight: '700',
    marginBottom: XSpacing.md,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: XSpacing.xl,
  },
  chip: {
    paddingHorizontal: XSpacing.lg,
    paddingVertical: XSpacing.sm,
    borderRadius: XBorderRadius.full,
    borderWidth: 1,
    borderColor: XColors.border,
    marginRight: XSpacing.sm,
    marginBottom: XSpacing.sm,
  },
  chipSelected: {
    backgroundColor: XColors.primary,
    borderColor: XColors.primary,
  },
  chipText: {
    ...XTypography.bodySmall,
    color: XColors.textPrimary,
  },
  chipTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  button: {
    backgroundColor: XColors.primary,
    paddingVertical: XSpacing.md,
    borderRadius: XBorderRadius.full,
    alignItems: 'center',
    marginTop: XSpacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...XTypography.titleLarge,
    color: '#ffffff',
    fontWeight: '700',
  },
  loadingContainer: {
    marginTop: XSpacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    ...XTypography.bodyMedium,
    marginTop: XSpacing.md,
    color: XColors.textSecondary,
  },
  errorContainer: {
    marginTop: XSpacing.lg,
    padding: XSpacing.md,
    backgroundColor: '#fff3f3',
    borderRadius: XBorderRadius.md,
    borderWidth: 1,
    borderColor: '#e53935',
  },
  errorText: {
    ...XTypography.bodyMedium,
    color: '#c62828',
  },
  resultContainer: {
    marginTop: XSpacing.xxl,
    alignItems: 'center',
  },
  resultTitle: {
    ...XTypography.titleLarge,
    color: XColors.primary,
    fontWeight: '700',
    marginBottom: XSpacing.lg,
  },
  resultImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: XBorderRadius.md,
    marginBottom: XSpacing.lg,
  },
  createAnotherButton: {
    marginTop: XSpacing.md,
    paddingVertical: XSpacing.sm,
    paddingHorizontal: XSpacing.xl,
    borderRadius: XBorderRadius.full,
    borderWidth: 1,
    borderColor: XColors.primary,
  },
  createAnotherText: {
    ...XTypography.bodyMedium,
    color: XColors.primary,
    fontWeight: '600',
  },
});
