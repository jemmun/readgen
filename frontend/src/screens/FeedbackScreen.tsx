import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { feedbackApi } from '../api/feedback';
import { XColors, XTypography, XSpacing, XBorderRadius } from '../theme/xStyle';

type Props = StackScreenProps<RootStackParamList, 'Feedback'>;

const CATEGORIES = [
  { key: 'bug', label: '🐛 Bug Report', color: '#ef4444' },
  { key: 'feature', label: '💡 Feature Request', color: '#3b82f6' },
  { key: 'general', label: '💬 General Feedback', color: '#10b981' },
];

export default function FeedbackScreen({ navigation }: Props) {
  const [category, setCategory] = useState('bug');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please provide feedback content');
      return;
    }
    setLoading(true);
    try {
      await feedbackApi.submit({ category, content: content.trim() });
      Alert.alert('Success', 'Thank you for your feedback!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Submit Feedback</Text>
        <Text style={styles.subtitle}>
          Help us improve ReadGen by reporting bugs, suggesting features, or sharing your thoughts.
        </Text>

        {/* Category Selection */}
        <Text style={styles.sectionLabel}>Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryBtn,
                category === cat.key && styles.categoryBtnActive,
                { borderColor: cat.color },
              ]}
              onPress={() => setCategory(cat.key)}
            >
              <Text
                style={[
                  styles.categoryText,
                  category === cat.key && { color: cat.color, fontWeight: '700' },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content Input */}
        <Text style={styles.sectionLabel}>Your Feedback</Text>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Describe your feedback in detail..."
          multiline
          numberOfLines={8}
          style={styles.input}
          mode="outlined"
          outlineColor={XColors.border}
          activeOutlineColor={XColors.primary}
          textColor={XColors.textPrimary}
        />

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Feedback</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: XColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: XSpacing.lg,
    paddingBottom: 100,
  },
  title: {
    ...XTypography.headlineMedium,
    color: XColors.textPrimary,
    fontWeight: '700',
    marginBottom: XSpacing.sm,
  },
  subtitle: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
    marginBottom: XSpacing.xl,
    lineHeight: 22,
  },
  sectionLabel: {
    ...XTypography.bodyLarge,
    color: XColors.textPrimary,
    fontWeight: '700',
    marginBottom: XSpacing.md,
  },
  categoryGrid: {
    gap: XSpacing.sm,
    marginBottom: XSpacing.xl,
  },
  categoryBtn: {
    padding: XSpacing.md,
    borderRadius: XBorderRadius.md,
    borderWidth: 2,
    borderColor: XColors.border,
    backgroundColor: XColors.surface,
  },
  categoryBtnActive: {
    backgroundColor: XColors.background,
  },
  categoryText: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
  },
  input: {
    marginBottom: XSpacing.xl,
    backgroundColor: XColors.background,
    fontSize: XTypography.bodyLarge.fontSize,
    lineHeight: XTypography.bodyLarge.lineHeight,
    minHeight: 150,
  },
  submitBtn: {
    backgroundColor: XColors.primary,
    paddingVertical: XSpacing.md,
    borderRadius: XBorderRadius.full,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    ...XTypography.titleLarge,
    color: '#ffffff',
    fontWeight: '700',
  },
});
