import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Platform } from 'react-native';
import { Text, Button, Card, ActivityIndicator, Divider, FAB, Surface, Chip, IconButton, TextInput, Portal, Modal } from 'react-native-paper';
import { StackNavigationProp, StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Novel, Chapter } from '../types';
import { novelsApi } from '../api/novels';
import { chaptersApi } from '../api/chapters';
import { generationApi } from '../api/generation';
import { illustrationsApi, Illustration } from '../api/illustrations';
import { reviewsApi, NovelReview } from '../api/reviews';
import { novelTagsApi, NovelTag } from '../api/novelTags';
import { exportsApi } from '../api/exports';
import { useI18n } from '../i18n/I18nContext';
import { getGenreByKey } from '../utils/novelGenres';
import { XColors } from '../theme/xStyle';
import OutlineEditor from '../components/OutlineEditor';
import { OutlineViewer } from '../components/OutlineEditor';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

type NovelDetailScreenProps = StackScreenProps<RootStackParamList, 'NovelDetail'>;

function DesignField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.fieldRow}>
      <Text variant="bodySmall" style={styles.fieldLabel}>{label}:</Text>
      <Text variant="bodyMedium" style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

export default function NovelDetailScreen({ navigation, route }: NovelDetailScreenProps) {
  const { t, language } = useI18n();
  const { novelId } = route.params;
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [outline, setOutline] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [publishLoading, setPublishLoading] = useState(false);
  const [editingOutline, setEditingOutline] = useState(false);
  const [editableOutline, setEditableOutline] = useState('');
  const [outlineSaving, setOutlineSaving] = useState(false);
  const [regeneratingOutline, setRegeneratingOutline] = useState(false);
  const [novelIllustrations, setNovelIllustrations] = useState<Illustration[]>([]);
  const [reviews, setReviews] = useState<NovelReview[]>([]);
  const [myReview, setMyReview] = useState<NovelReview | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [tags, setTags] = useState<NovelTag[]>([]);
  const [newTag, setNewTag] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [novelRes, chaptersRes, reviewsRes, tagsRes] = await Promise.all([
        novelsApi.get(novelId),
        chaptersApi.listByNovel(novelId),
        reviewsApi.getByNovel(novelId),
        novelTagsApi.getByNovel(novelId),
      ]);
      setNovel(novelRes.data);
      setChapters(chaptersRes.data);
      setReviews(reviewsRes.data);
      setTags(tagsRes.data);

      // Try to load outline if available
      try {
        const outlineRes = await generationApi.getOutline(novelId);
        setOutline(outlineRes.data.outline);
      } catch {
        // Outline may not exist yet, that's fine
      }

      // Load illustrations linked to this novel
      try {
        const illRes = await illustrationsApi.getAll({ novel_id: novelId });
        setNovelIllustrations(illRes.data);
      } catch {
        // Illustrations may not exist
      }
    } catch (error) {
      console.error('Failed to load novel:', error);
    } finally {
      setLoading(false);
    }
  }, [novelId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    navigation.setOptions({ title: t('novelDetails') });
  }, [navigation, t]);

  const handleStartInitialGeneration = async () => {
    try {
      const genResponse = await generationApi.start(novelId);
      navigation.navigate('Generation', {
        novelId,
        sessionId: genResponse.data.session_id,
        type: 'initial',
        outline: genResponse.data.outline,
      });
    } catch (error) {
      console.error('Failed to start generation:', error);
    }
  };

  const handleGenerateNext = async () => {
    try {
      const genResponse = await generationApi.start(novelId);
      navigation.navigate('Generation', {
        novelId,
        sessionId: genResponse.data.session_id,
        type: 'continue',
      });
    } catch (error) {
      console.error('Failed to start generation:', error);
    }
  };

  const handleReadChapter = (chapterId: number) => {
    navigation.navigate('Reader', { novelId, chapterId });
  };

  const handleExport = async (format: 'epub' | 'pdf') => {
    if (!novel || chapters.length === 0) {
      Alert.alert(t('noChapters'), t('noChaptersExportHint'));
      return;
    }
    
    // Show export options dialog
    Alert.alert(
      `${t('exportAs')} ${format.toUpperCase()}`,
      t('exportOptions'),
      [
        {
          text: t('fullBook'),
          onPress: () => doExport(format, { includeMetadata: true }),
        },
        {
          text: t('chaptersOnly'),
          onPress: () => doExport(format, { includeMetadata: false }),
        },
        { text: t('cancel'), style: 'cancel' },
      ]
    );
  };

  const doExport = async (format: 'epub' | 'pdf', options: any) => {
    if (!novel) return;
    
    try {
      const exportUrl = format === 'epub'
        ? await exportsApi.getEpubUrl(novel.id, options)
        : await exportsApi.getPdfUrl(novel.id, options);

      const ext = format === 'epub' ? 'epub' : 'pdf';
      const safeTitle = novel.title.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 50);
      const fileUri = FileSystem.documentDirectory + `${safeTitle}.${ext}`;

      const token = await (await import('../api/auth')).authApi.getToken();
      const downloadRes = await FileSystem.downloadAsync(exportUrl, fileUri, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (downloadRes.status !== 200) {
        Alert.alert('Error', 'Failed to download file');
        return;
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(downloadRes.uri, {
          mimeType: format === 'epub'
            ? 'application/epub+zip'
            : 'application/pdf',
          dialogTitle: `${t('exportAs')} ${novel.title} ${format.toUpperCase()}`,
        });
      } else {
        Alert.alert(t('exportSuccess'), `File saved to: ${downloadRes.uri}`);
      }
    } catch (error: any) {
      console.error('Export failed:', error);
      Alert.alert(t('exportError'), error.message || t('exportFailed'));
    }
  };

  const handleTogglePublish = async () => {
    if (!novel || publishLoading) return;
    setPublishLoading(true);
    try {
      const res = await novelsApi.publish(novel.id);
      setNovel({ ...novel, is_published: res.data.is_published });
    } catch (error) {
      console.error('Publish toggle failed:', error);
    } finally {
      setPublishLoading(false);
    }
  };

  const handleDeleteNovel = () => {
    Alert.alert(
      t('deleteNovel'),
      t('deleteNovelConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await novelsApi.delete(novelId);
              navigation.goBack();
            } catch (error) {
              console.error('Delete novel failed:', error);
            }
          },
        },
      ]
    );
  };

  const handleEditDesign = () => {
    if (!novel) return;
    navigation.navigate('CreateNovel', {
      novelId: novel.id,
      title: novel.title,
      theme_description: novel.theme_description,
      genre: novel.genre,
      style: novel.style,
      tone: novel.tone,
      setting: novel.setting,
      protagonist_info: novel.protagonist_info,
      target_audience: novel.target_audience,
      language: novel.language,
      max_chapters: novel.max_chapters,
    });
  };

  const handleGenerateCover = async () => {
    if (!novel) return;
    try {
      const prompt = `Book cover illustration for a ${novel.genre || ''} novel titled "${novel.title}": ${novel.theme_description}`;
      const res = await illustrationsApi.create({
        prompt,
        style: 'realistic',
        size: '1024x1792',
        illustration_type: 'cover',
      });
      // Reload to show new cover
      const novelRes = await novelsApi.get(novelId);
      setNovel(novelRes.data);
      const illRes = await illustrationsApi.getAll({ novel_id: novelId });
      setNovelIllustrations(illRes.data);
    } catch (err) {
      console.error('Failed to generate cover:', err);
    }
  };

  const handleBatchGenerate = async () => {
    if (!novel) return;
    try {
      await illustrationsApi.batchGenerate(novel.id);
      const illRes = await illustrationsApi.getAll({ novel_id: novelId });
      setNovelIllustrations(illRes.data);
      const novelRes = await novelsApi.get(novelId);
      setNovel(novelRes.data);
    } catch (err) {
      console.error('Failed to batch generate illustrations:', err);
    }
  };

  const handleSubmitReview = async () => {
    try {
      await reviewsApi.create({
        novel_id: novelId,
        rating: reviewRating,
        review_text: reviewText.trim() || undefined,
      });
      setShowReviewDialog(false);
      setReviewText('');
      setReviewRating(5);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to submit review');
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    try {
      await reviewsApi.delete(reviewId);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to delete review');
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    try {
      await novelTagsApi.add(novelId, newTag.trim());
      setNewTag('');
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to add tag');
    }
  };

  const handleRemoveTag = async (tagId: number) => {
    try {
      await novelTagsApi.remove(tagId);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to remove tag');
    }
  };

  const handleStartEditOutline = () => {
    setEditableOutline(outline);
    setEditingOutline(true);
  };

  const handleSaveOutline = async () => {
    setOutlineSaving(true);
    try {
      await generationApi.updateNovelOutline(novelId, editableOutline);
      setOutline(editableOutline);
      setEditingOutline(false);
    } catch (error) {
      console.error('Save outline failed:', error);
    } finally {
      setOutlineSaving(false);
    }
  };

  const handleRegenerateOutline = async () => {
    setRegeneratingOutline(true);
    try {
      const res = await generationApi.regenerateOutline(novelId);
      setOutline(res.data.outline);
      setEditableOutline(res.data.outline);
    } catch (error) {
      console.error('Regenerate outline failed:', error);
    } finally {
      setRegeneratingOutline(false);
    }
  };

  if (loading || !novel) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.infoCard}>
          <Card.Content>
            {/* Cover image */}
            {novel.cover_image_url ? (
              <TouchableOpacity onPress={() => navigation.navigate('IllustrationCreate')}>
                <Image
                  source={{ uri: `http://localhost:8000${novel.cover_image_url}` }}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ) : null}
            <View style={styles.titleRow}>
              <Text variant="headlineSmall" style={styles.titleText}>{novel.title}</Text>
              <View style={styles.titleActions}>
                <IconButton
                  icon="pencil"
                  size={20}
                  onPress={handleEditDesign}
                  style={styles.iconBtn}
                />
                <IconButton
                  icon="delete"
                  size={20}
                  iconColor="#e0245e"
                  onPress={handleDeleteNovel}
                  style={styles.iconBtn}
                />
                <IconButton
                  icon="share-variant"
                  size={20}
                  onPress={async () => {
                    try {
                      const res = await novelsApi.share(novel.id);
                      import('react-native').then(({ Linking, Alert }) => {
                        Alert.alert('Share', `Share this link:\n${res.data.share_url}`);
                      });
                    } catch (e) { console.error('Share failed:', e); }
                  }}
                  style={styles.iconBtn}
                />
              </View>
            </View>
            {/* Generate Cover button */}
            {!novel.cover_image_url && (
              <TouchableOpacity style={styles.generateCoverBtn} onPress={handleGenerateCover}>
                <Text style={styles.generateCoverBtnText}>🎨 Generate Cover</Text>
              </TouchableOpacity>
            )}
            <View style={styles.chipRow}>
              {novel.genre && (() => {
                const genreObj = getGenreByKey(novel.genre);
                return (
                  <Chip style={styles.chip}>
                    {genreObj ? `${genreObj.emoji} ${language === 'zh' ? genreObj.labelZh : genreObj.labelEn}` : novel.genre}
                  </Chip>
                );
              })()}
              {novel.style && <Chip style={styles.chip}>{novel.style}</Chip>}
              {novel.tone && <Chip style={styles.chip}>{novel.tone}</Chip>}
            </View>
            <Text variant="bodySmall" style={styles.status}>
              {t('status')}: {novel.status}
            </Text>
            <View style={styles.publishRow}>
              <Text variant="bodySmall" style={styles.publishLabel}>
                {novel.is_published ? 'Published' : 'Unpublished'}
              </Text>
              <TouchableOpacity
                style={[
                  styles.publishBtn,
                  novel.is_published ? styles.publishBtnActive : styles.publishBtnInactive,
                ]}
                onPress={handleTogglePublish}
                disabled={publishLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.publishBtnText}>
                  {publishLoading
                    ? '...'
                    : novel.is_published
                    ? 'Unpublish'
                    : 'Publish'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.exportBtn}
                onPress={() => {
                  Alert.alert('Export', 'Choose format', [
                    {
                      text: '📖 EPUB',
                      onPress: () => handleExport('epub'),
                    },
                    {
                      text: '📄 PDF',
                      onPress: () => handleExport('pdf'),
                    },
                    { text: t('cancel'), style: 'cancel' },
                  ]);
                }}
              >
                <Text style={styles.exportBtnText}>Export</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.designCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {t('novelDesignDocument')}
              </Text>
              <TouchableOpacity onPress={handleEditDesign} style={styles.editLink}>
                <Text style={styles.editLinkText}>{t('editDesign')}</Text>
              </TouchableOpacity>
            </View>
            <Divider style={styles.divider} />

            <DesignField label={t('themeConcept')} value={novel.theme_description} />
            <DesignField label={t('genre')} value={novel.genre} />
            <DesignField label={t('writingStyle')} value={novel.style} />
            <DesignField label={t('targetAudience')} value={novel.target_audience} />
            <DesignField label={t('protagonist')} value={novel.protagonist_info} />
            <DesignField label={t('setting')} value={novel.setting} />
            <DesignField label={t('tone')} value={novel.tone} />
            <DesignField label={t('maxChapters')} value={String(novel.max_chapters)} />
          </Card.Content>
        </Card>

        {/* Tags Section */}
        <Card style={styles.tagsCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsContainer}>
              {tags.map((tag) => (
                <Chip
                  key={tag.id}
                  style={styles.tagChip}
                  onClose={() => handleRemoveTag(tag.id)}
                >
                  {tag.tag}
                </Chip>
              ))}
            </View>
            <View style={styles.addTagRow}>
              <TextInput
                value={newTag}
                onChangeText={setNewTag}
                placeholder="Add a tag..."
                style={styles.tagInput}
                mode="outlined"
                outlineColor={XColors.border}
                activeOutlineColor={XColors.primary}
                textColor={XColors.textPrimary}
                onSubmitEditing={handleAddTag}
              />
              <TouchableOpacity
                style={styles.addTagBtn}
                onPress={handleAddTag}
                activeOpacity={0.7}
              >
                <Text style={styles.addTagBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>

        {outline && (
          <Card style={styles.outlineCard}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  {t('outline')}
                </Text>
                <View style={styles.outlineActions}>
                  <TouchableOpacity onPress={handleStartEditOutline} style={styles.editLink}>
                    <Text style={styles.editLinkText}>{t('editOutline')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleRegenerateOutline}
                    style={styles.regenerateBtn}
                    disabled={regeneratingOutline}
                  >
                    <Text style={styles.regenerateBtnText}>
                      {regeneratingOutline ? t('regeneratingOutline') : t('regenerateOutline')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Divider style={styles.divider} />
              <OutlineViewer outline={outline} />
            </Card.Content>
          </Card>
        )}

        {novelIllustrations.length > 0 && (
          <>
            <View style={styles.illustrationHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {t('illustrations')} ({novelIllustrations.length})
              </Text>
              <TouchableOpacity style={styles.batchGenBtn} onPress={handleBatchGenerate}>
                <Text style={styles.batchGenBtnText}>🎨 Batch Generate</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.illustrationScroll}>
              {novelIllustrations.map(ill => (
                <TouchableOpacity
                  key={ill.id}
                  onPress={() => navigation.navigate('IllustrationDetail', { illustrationId: ill.id })}
                >
                  <Image
                    source={{ uri: `http://localhost:8000${ill.image_url}` }}
                    style={styles.illustrationThumb}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Reviews Section */}
        <View style={styles.reviewsHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Reviews ({reviews.length})
          </Text>
          <TouchableOpacity
            style={styles.addReviewBtn}
            onPress={() => setShowReviewDialog(true)}
          >
            <Text style={styles.addReviewBtnText}>✍️ Write Review</Text>
          </TouchableOpacity>
        </View>

        {reviews.map((review) => (
          <Card key={review.id} style={styles.reviewCard}>
            <Card.Content>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewAuthor}>
                  <Text style={styles.reviewAuthorName}>
                    {review.author?.username || 'Anonymous'}
                  </Text>
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.reviewRating}>
                  <Text style={styles.reviewStars}>
                    {'⭐'.repeat(review.rating)}
                  </Text>
                </View>
              </View>
              {review.review_text && (
                <Text style={styles.reviewText}>{review.review_text}</Text>
              )}
            </Card.Content>
          </Card>
        ))}

        {chapters.length > 0 && (
          <>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('chapterList')} ({chapters.length})
            </Text>
            {chapters.map((chapter) => (
              <TouchableOpacity
                key={chapter.id}
                onPress={() => handleReadChapter(chapter.id)}
              >
                <Card style={styles.chapterCard}>
                  <Card.Content>
                    <Text variant="titleSmall">
                      Chapter {chapter.chapter_number}: {chapter.title}
                    </Text>
                    <Text variant="bodySmall" style={styles.chapterMeta}>
                      {chapter.word_count} words
                    </Text>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      <Surface style={styles.bottomBar} elevation={4}>
        {novel.status === 'draft' && chapters.length === 0 ? (
          <Button
            mode="contained"
            onPress={handleStartInitialGeneration}
            style={styles.bottomButton}
            icon="lightning-bolt"
          >
            {t('startInitialGeneration')}
          </Button>
        ) : (
          <Button
            mode="contained"
            onPress={handleGenerateNext}
            style={styles.bottomButton}
            icon="lightning-bolt"
          >
            {t('generateNextChapter')}
          </Button>
        )}
      </Surface>

      <FAB
        icon="book-open"
        style={styles.fab}
        onPress={() => navigation.navigate('Reader', { novelId })}
        label={t('read')}
      />

      <Portal>
        <Modal
          visible={editingOutline}
          onDismiss={() => setEditingOutline(false)}
          contentContainerStyle={styles.outlineModal}
        >
          <Text variant="titleMedium" style={styles.modalTitle}>
            {t('editOutline')}
          </Text>
          <ScrollView style={styles.outlineModalScroll}>
            <OutlineEditor
              outline={editableOutline}
              onOutlineChange={setEditableOutline}
            />
          </ScrollView>
          <View style={styles.modalActions}>
            <Button
              mode="text"
              onPress={() => setEditingOutline(false)}
            >
              {t('cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveOutline}
              loading={outlineSaving}
              disabled={outlineSaving}
            >
              {t('saveOutline')}
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    overflow: 'scroll',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 160,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    marginRight: 4,
  },
  status: {
    marginTop: 8,
    color: XColors.primary,
    fontWeight: 'bold',
  },
  designCard: {
    marginBottom: 16,
  },
  fieldRow: {
    marginBottom: 10,
  },
  fieldLabel: {
    color: '#888',
    marginBottom: 2,
  },
  fieldValue: {
    lineHeight: 22,
  },
  bottomBar: {
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  bottomButton: {
    width: '100%',
  },
  divider: {
    marginVertical: 12,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  chapterCard: {
    marginBottom: 8,
  },
  chapterMeta: {
    marginTop: 4,
    color: '#888',
  },

  outlineCard: {
    marginBottom: 16,
  },
  outlineText: {
    lineHeight: 22,
    color: '#555',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 64,
  },
  publishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  publishLabel: {
    color: '#555',
    fontWeight: '600',
  },
  publishBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  publishBtnInactive: {
    backgroundColor: '#1d9bf0',
  },
  publishBtnActive: {
    backgroundColor: '#e0245e',
  },
  publishBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleText: {
    flex: 1,
    marginRight: 8,
  },
  titleActions: {
    flexDirection: 'row',
  },
  iconBtn: {
    margin: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  editLink: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editLinkText: {
    color: XColors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  outlineActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  regenerateBtn: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 4,
  },
  regenerateBtnText: {
    color: XColors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  outlineModal: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    maxHeight: '85%',
  },
  outlineModalScroll: {
    maxHeight: 500,
  },
  modalTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  outlineInput: {
    maxHeight: 400,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  coverImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  illustrationScroll: {
    marginBottom: 16,
  },
  illustrationThumb: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
  generateCoverBtn: {
    backgroundColor: XColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  generateCoverBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  exportBtn: {
    backgroundColor: '#4a5568',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
  },
  exportBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  illustrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  batchGenBtn: {
    backgroundColor: '#5b21b6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  batchGenBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  // Reviews
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  addReviewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: XColors.primary,
    borderRadius: 16,
  },
  addReviewBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  reviewCard: {
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewAuthor: {
    flex: 1,
  },
  reviewAuthorName: {
    fontWeight: '700',
    fontSize: 14,
    color: XColors.textPrimary,
  },
  reviewDate: {
    fontSize: 12,
    color: XColors.textSecondary,
    marginTop: 2,
  },
  reviewRating: {
    alignItems: 'flex-end',
  },
  reviewStars: {
    fontSize: 14,
  },
  reviewText: {
    fontSize: 14,
    color: XColors.textPrimary,
    lineHeight: 20,
    marginTop: 4,
  },
  // Tags
  tagsCard: {
    marginTop: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tagChip: {
    backgroundColor: XColors.primary + '20',
  },
  addTagRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    backgroundColor: XColors.background,
  },
  addTagBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: XColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTagBtnText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
});
