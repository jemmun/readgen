import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Modal } from 'react-native';
import { Text, TextInput, ActivityIndicator, Chip, Button } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useI18n } from '../i18n/I18nContext';
import { XColors, XTypography, XSpacing, XBorderRadius } from '../theme/xStyle';
import { illustrationsApi, Illustration } from '../api/illustrations';
import { novelsApi } from '../api/novels';
import { Novel } from '../types';

type IllustrationDetailProps = StackScreenProps<RootStackParamList, 'IllustrationDetail'>;

export default function IllustrationDetailScreen({ route, navigation }: IllustrationDetailProps) {
  const { t } = useI18n();
  const { illustrationId } = route.params;

  const [illustration, setIllustration] = useState<Illustration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Editable fields
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [illustrationType, setIllustrationType] = useState('illustration');
  const [novelId, setNovelId] = useState<number | null>(null);

  // Novel picker
  const [novels, setNovels] = useState<Novel[]>([]);
  const [showNovelPicker, setShowNovelPicker] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const loadIllustration = useCallback(async () => {
    try {
      setLoading(true);
      const res = await illustrationsApi.getById(illustrationId);
      const ill = res.data;
      setIllustration(ill);
      setDescription(ill.description || '');
      setTags(ill.tags || '');
      setIllustrationType(ill.illustration_type || 'illustration');
      setNovelId(ill.novel_id || null);
      setHasChanges(false);
    } catch (err: any) {
      console.error('[IllustrationDetail] load failed:', err);
      setError(err.response?.data?.detail || 'Failed to load illustration');
    } finally {
      setLoading(false);
    }
  }, [illustrationId]);

  const loadNovels = useCallback(async () => {
    try {
      const res = await novelsApi.list();
      setNovels(res.data);
    } catch (err) {
      console.error('[IllustrationDetail] load novels failed:', err);
    }
  }, []);

  useEffect(() => {
    loadIllustration();
  }, [loadIllustration]);

  useEffect(() => {
    loadNovels();
  }, [loadNovels]);

  useEffect(() => {
    navigation.setOptions({ title: t('illustrationDetail') });
  }, [navigation, t]);

  const handleSave = async () => {
    if (!illustration) return;
    setSaving(true);
    setError('');
    try {
      const data: Record<string, any> = {};
      if (description !== (illustration.description || '')) data.description = description;
      if (tags !== (illustration.tags || '')) data.tags = tags;
      if (illustrationType !== (illustration.illustration_type || 'illustration')) data.illustration_type = illustrationType;
      if (novelId !== illustration.novel_id) data.novel_id = novelId;

      if (Object.keys(data).length > 0) {
        const res = await illustrationsApi.update(illustration.id, data);
        setIllustration(res.data);
        setHasChanges(false);
      }
    } catch (err: any) {
      console.error('[IllustrationDetail] save failed:', err);
      setError(err.response?.data?.detail || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('deleteIllustration'),
      t('deleteIllustrationConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await illustrationsApi.delete(illustrationId);
              navigation.goBack();
            } catch (err) {
              console.error('[IllustrationDetail] delete failed:', err);
            }
          },
        },
      ]
    );
  };

  const handleUnlinkNovel = async () => {
    if (!illustration) return;
    try {
      const res = await illustrationsApi.unlinkNovel(illustration.id);
      setIllustration(res.data);
      setNovelId(null);
    } catch (err) {
      console.error('[IllustrationDetail] unlink failed:', err);
    }
  };

  const handleSelectNovel = async (novel: Novel) => {
    setShowNovelPicker(false);
    setNovelId(novel.id);
    setHasChanges(true);
  };

  // Track changes
  useEffect(() => {
    if (!illustration) return;
    const changed =
      description !== (illustration.description || '') ||
      tags !== (illustration.tags || '') ||
      illustrationType !== (illustration.illustration_type || 'illustration') ||
      novelId !== illustration.novel_id;
    setHasChanges(changed);
  }, [description, tags, illustrationType, novelId, illustration]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={XColors.primary} />
      </View>
    );
  }

  if (!illustration) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'Illustration not found'}</Text>
      </View>
    );
  }

  const linkedNovel = novelId ? novels.find(n => n.id === novelId) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Image */}
      {illustration.image_url ? (
        <Image
          source={{ uri: `http://localhost:8000${illustration.image_url}` }}
          style={styles.image}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderIcon}>🎨</Text>
          <Text style={styles.imagePlaceholderText}>{illustration.status}</Text>
        </View>
      )}

      {/* Prompt (read-only) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('prompt')}</Text>
        <Text style={styles.promptText}>{illustration.prompt}</Text>
        <Text style={styles.metaText}>{illustration.style} · {illustration.size}</Text>
      </View>

      {/* Type selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('illustrationType')}</Text>
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.typeChip, illustrationType === 'cover' && styles.typeChipActive]}
            onPress={() => setIllustrationType('cover')}
          >
            <Text style={[styles.typeChipText, illustrationType === 'cover' && styles.typeChipTextActive]}>
              {t('cover')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeChip, illustrationType === 'illustration' && styles.typeChipActive]}
            onPress={() => setIllustrationType('illustration')}
          >
            <Text style={[styles.typeChipText, illustrationType === 'illustration' && styles.typeChipTextActive]}>
              {t('illustration')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('illustrationDescription')}</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={t('illustrationDescriptionPlaceholder')}
          multiline
          numberOfLines={3}
          mode="outlined"
          outlineColor={XColors.border}
          activeOutlineColor={XColors.primary}
          style={styles.input}
        />
      </View>

      {/* Tags */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('illustrationTags')}</Text>
        <TextInput
          value={tags}
          onChangeText={setTags}
          placeholder={t('illustrationTagsPlaceholder')}
          mode="outlined"
          outlineColor={XColors.border}
          activeOutlineColor={XColors.primary}
          style={styles.input}
        />
        {tags ? (
          <View style={styles.tagRow}>
            {tags.split(',').map((tag, idx) => (
              tag.trim() ? (
                <View key={idx} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag.trim()}</Text>
                </View>
              ) : null
            ))}
          </View>
        ) : null}
      </View>

      {/* Novel association */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('associateNovel')}</Text>
        {linkedNovel ? (
          <View style={styles.linkedNovelRow}>
            <View style={styles.linkedNovelInfo}>
              <Text style={styles.linkedNovelTitle}>{linkedNovel.title}</Text>
              <Text style={styles.linkedNovelMeta}>{t('linkedNovel')}</Text>
            </View>
            <TouchableOpacity onPress={handleUnlinkNovel} style={styles.unlinkButton}>
              <Text style={styles.unlinkButtonText}>{t('unlinkNovel')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.selectNovelButton}
            onPress={() => setShowNovelPicker(true)}
          >
            <Text style={styles.selectNovelText}>
              {novelId ? `Novel #${novelId}` : t('selectNovel')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Save button */}
      {hasChanges && (
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>{t('saveChanges')}</Text>
          )}
        </TouchableOpacity>
      )}

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Delete */}
      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>{t('deleteIllustration')}</Text>
      </TouchableOpacity>

      {/* Novel Picker Modal */}
      <Modal visible={showNovelPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectNovel')}</Text>
              <TouchableOpacity onPress={() => setShowNovelPicker(false)}>
                <Text style={styles.modalClose}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
            {novels.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>{t('noNovelsAvailable')}</Text>
              </View>
            ) : (
              <ScrollView>
                {novels.map(novel => (
                  <TouchableOpacity
                    key={novel.id}
                    style={styles.novelItem}
                    onPress={() => handleSelectNovel(novel)}
                  >
                    <Text style={styles.novelItemTitle}>{novel.title}</Text>
                    <Text style={styles.novelItemMeta}>{novel.genre || ''}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: XColors.background,
  },
  contentContainer: {
    padding: XSpacing.lg,
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: XColors.background,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: XBorderRadius.md,
    marginBottom: XSpacing.lg,
    backgroundColor: XColors.border,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: XBorderRadius.md,
    backgroundColor: XColors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: XSpacing.lg,
  },
  imagePlaceholderIcon: {
    fontSize: 64,
  },
  imagePlaceholderText: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
    marginTop: XSpacing.sm,
  },
  section: {
    marginBottom: XSpacing.lg,
  },
  sectionTitle: {
    ...XTypography.titleLarge,
    color: XColors.textPrimary,
    fontWeight: '700',
    marginBottom: XSpacing.sm,
  },
  promptText: {
    ...XTypography.bodyMedium,
    color: XColors.textPrimary,
    lineHeight: 22,
  },
  metaText: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    marginTop: XSpacing.xs,
  },
  input: {
    backgroundColor: XColors.background,
  },
  chipRow: {
    flexDirection: 'row',
  },
  typeChip: {
    paddingHorizontal: XSpacing.lg,
    paddingVertical: XSpacing.sm,
    borderRadius: XBorderRadius.full,
    borderWidth: 1,
    borderColor: XColors.border,
    marginRight: XSpacing.sm,
  },
  typeChipActive: {
    backgroundColor: XColors.primary,
    borderColor: XColors.primary,
  },
  typeChipText: {
    ...XTypography.bodySmall,
    color: XColors.textPrimary,
  },
  typeChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: XSpacing.sm,
  },
  tagChip: {
    backgroundColor: XColors.primary + '15',
    paddingHorizontal: XSpacing.md,
    paddingVertical: XSpacing.xs,
    borderRadius: XBorderRadius.full,
    marginRight: XSpacing.xs,
    marginBottom: XSpacing.xs,
  },
  tagChipText: {
    ...XTypography.bodySmall,
    color: XColors.primary,
  },
  linkedNovelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: XSpacing.md,
    backgroundColor: XColors.surface,
    borderRadius: XBorderRadius.md,
    borderWidth: 1,
    borderColor: XColors.border,
  },
  linkedNovelInfo: {
    flex: 1,
  },
  linkedNovelTitle: {
    ...XTypography.bodyMedium,
    color: XColors.textPrimary,
    fontWeight: '600',
  },
  linkedNovelMeta: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    marginTop: XSpacing.xs,
  },
  unlinkButton: {
    paddingHorizontal: XSpacing.md,
    paddingVertical: XSpacing.sm,
  },
  unlinkButtonText: {
    ...XTypography.bodySmall,
    color: '#e53935',
    fontWeight: '600',
  },
  selectNovelButton: {
    padding: XSpacing.md,
    backgroundColor: XColors.surface,
    borderRadius: XBorderRadius.md,
    borderWidth: 1,
    borderColor: XColors.border,
    borderStyle: 'dashed' as const,
  },
  selectNovelText: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
  },
  saveButton: {
    backgroundColor: XColors.primary,
    paddingVertical: XSpacing.md,
    borderRadius: XBorderRadius.full,
    alignItems: 'center',
    marginBottom: XSpacing.lg,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...XTypography.titleLarge,
    color: '#ffffff',
    fontWeight: '700',
  },
  errorContainer: {
    padding: XSpacing.md,
    backgroundColor: '#fff3f3',
    borderRadius: XBorderRadius.md,
    borderWidth: 1,
    borderColor: '#e53935',
    marginBottom: XSpacing.lg,
  },
  errorText: {
    ...XTypography.bodyMedium,
    color: '#c62828',
  },
  deleteButton: {
    paddingVertical: XSpacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e53935',
    borderRadius: XBorderRadius.full,
  },
  deleteButtonText: {
    ...XTypography.bodyMedium,
    color: '#e53935',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: XColors.background,
    borderTopLeftRadius: XBorderRadius.xl,
    borderTopRightRadius: XBorderRadius.xl,
    maxHeight: '70%',
    paddingBottom: XSpacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: XSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
  },
  modalTitle: {
    ...XTypography.titleLarge,
    color: XColors.textPrimary,
    fontWeight: '700',
  },
  modalClose: {
    ...XTypography.bodyMedium,
    color: XColors.primary,
  },
  modalEmpty: {
    padding: XSpacing.xxl,
    alignItems: 'center',
  },
  modalEmptyText: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
  },
  novelItem: {
    padding: XSpacing.md,
    paddingHorizontal: XSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
  },
  novelItemTitle: {
    ...XTypography.bodyMedium,
    color: XColors.textPrimary,
    fontWeight: '600',
  },
  novelItemMeta: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    marginTop: XSpacing.xs,
  },
});
