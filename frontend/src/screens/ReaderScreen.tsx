import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Image, Alert } from 'react-native';
import { Text, Button, ActivityIndicator, IconButton, Modal, Portal, TextInput, Surface, Chip } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Novel, Chapter } from '../types';
import { novelsApi } from '../api/novels';
import { chaptersApi } from '../api/chapters';
import { generationApi } from '../api/generation';
import { readingProgressApi } from '../api/readingProgress';
import { illustrationsApi } from '../api/illustrations';
import { readingProgressShareApi } from '../api/readingProgressShare';
import { useI18n } from '../i18n/I18nContext';
import { useReaderSettings } from '../contexts/ReaderSettingsContext';
import ChapterRenderer from '../components/ChapterRenderer';
import ReaderSettingsPanel from '../components/ReaderSettingsPanel';

type ReaderScreenProps = StackScreenProps<RootStackParamList, 'Reader'>;

export default function ReaderScreen({ navigation, route }: ReaderScreenProps) {
  const { t } = useI18n();
  const { settings } = useReaderSettings();
  const { novelId, chapterId, readOnly } = route.params;
  const { width } = useWindowDimensions();
  const isWide = width > 768;

  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [chapterNavVisible, setChapterNavVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [showToc, setShowToc] = useState(!chapterId);
  const [editingChapter, setEditingChapter] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [chapterIllustrations, setChapterIllustrations] = useState<any[]>([]);
  const [bookmarked, setBookmarked] = useState(false);
  
  // Share progress state
  const [shareProgressVisible, setShareProgressVisible] = useState(false);
  const [shareThoughts, setShareThoughts] = useState('');
  const [shareRating, setShareRating] = useState(0);
  const [sharingProgress, setSharingProgress] = useState(false);

  const [userDirection, setUserDirection] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [novelRes, chaptersRes] = await Promise.all([
        novelsApi.get(novelId),
        chaptersApi.listByNovel(novelId),
      ]);
      setNovel(novelRes.data);
      setChapters(chaptersRes.data);

      // Load illustrations for this novel
      try {
        const illRes = await illustrationsApi.getAll({ novel_id: novelId });
        setChapterIllustrations(illRes.data);
      } catch (e) {}

      if (chapterId) {
        const ch = chaptersRes.data.find((c) => c.id === chapterId);
        if (ch) setCurrentChapter(ch);
        else if (chaptersRes.data.length > 0) {
          setCurrentChapter(chaptersRes.data[0]);
          setShowToc(false);
        }
      } else {
        // Try to restore reading progress
        try {
          const progRes = await readingProgressApi.get(novelId);
          if (progRes.data.chapter_id) {
            const ch = chaptersRes.data.find((c) => c.id === progRes.data.chapter_id);
            if (ch) {
              setCurrentChapter(ch);
              setShowToc(false);
            }
          }
        } catch (e) {
          // no progress saved, show TOC
        }
      }
    } catch (error) {
      console.error('Failed to load reader data:', error);
    } finally {
      setLoading(false);
    }
  }, [novelId, chapterId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load chapter illustrations when chapter changes
  useEffect(() => {
    if (currentChapter) {
      loadChapterIllustrations(currentChapter.id);
    }
  }, [currentChapter]);

  const loadChapterIllustrations = async (chapterId: number) => {
    try {
      const res = await illustrationsApi.getAll({ chapter_id: chapterId });
      setChapterIllustrations(res.data);
    } catch (error) {
      console.error('Failed to load chapter illustrations:', error);
      setChapterIllustrations([]);
    }
  };

  useEffect(() => {
    navigation.setOptions({ title: t('reader') });
  }, [navigation, t]);

  const goToChapter = (index: number) => {
    if (index >= 0 && index < chapters.length) {
      setCurrentChapter(chapters[index]);
      setChapterNavVisible(false);
      setShowToc(false);
      readingProgressApi.save({ novel_id: novelId, chapter_id: chapters[index].id, scroll_position: 0 }).catch(() => {});
    }
  };

  const handleSelectChapterFromToc = (index: number) => {
    if (index >= 0 && index < chapters.length) {
      setCurrentChapter(chapters[index]);
      setShowToc(false);
      readingProgressApi.save({ novel_id: novelId, chapter_id: chapters[index].id, scroll_position: 0 }).catch(() => {});
    }
  };

  const handleSaveChapterEdit = async () => {
    if (!currentChapter) return;
    try {
      await chaptersApi.update(currentChapter.id, { content: editContent });
      const updated = { ...currentChapter, content: editContent };
      setCurrentChapter(updated);
      setChapters(prev => prev.map(c => c.id === currentChapter.id ? updated : c));
      setEditingChapter(false);
    } catch (e) {
      console.error('Failed to save chapter:', e);
    }
  };

  const handleToggleBookmark = async () => {
    if (!currentChapter) return;
    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);
    try {
      await readingProgressApi.save({
        novel_id: novelId,
        chapter_id: currentChapter.id,
        scroll_position: 0,
      });
    } catch (e) {
      setBookmarked(!newBookmarked);
    }
  };

  const handleNextChapter = () => {
    const currentIndex = chapters.findIndex((c) => c.id === currentChapter?.id);
    if (currentIndex < chapters.length - 1) {
      goToChapter(currentIndex + 1);
    }
  };

  const handlePrevChapter = () => {
    const currentIndex = chapters.findIndex((c) => c.id === currentChapter?.id);
    if (currentIndex > 0) {
      goToChapter(currentIndex - 1);
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

  const handleSendDirectionAndContinue = async (direction: string) => {
    try {
      const genResponse = await generationApi.start(novelId);
      if (direction.trim()) {
        await generationApi.interact(genResponse.data.session_id, 'direction', direction);
      }
      setUserDirection('');
      navigation.navigate('Generation', {
        novelId,
        sessionId: genResponse.data.session_id,
        type: 'continue',
      });
    } catch (error) {
      console.error('Failed to start generation:', error);
    }
  };

  const handleQuickContinue = async (direction: string) => {
    await handleSendDirectionAndContinue(direction);
  };

  const handleShareProgress = async () => {
    if (!currentChapter || !novel) return;
    
    setSharingProgress(true);
    try {
      const progressPercentage = chapters.length > 0 
        ? (chapters.findIndex(c => c.id === currentChapter.id) + 1) / chapters.length * 100 
        : 0;
      
      await readingProgressShareApi.shareProgress({
        novel_id: novelId,
        chapter_id: currentChapter.id,
        chapter_number: currentChapter.chapter_number,
        chapter_title: currentChapter.title,
        progress_percentage: progressPercentage,
        thoughts: shareThoughts || undefined,
        rating: shareRating > 0 ? shareRating : undefined,
      });
      
      Alert.alert(t('success'), t('progressShared'));
      setShareProgressVisible(false);
      setShareThoughts('');
      setShareRating(0);
    } catch (error) {
      console.error('Failed to share progress:', error);
      Alert.alert(t('error'), t('shareFailed'));
    } finally {
      setSharingProgress(false);
    }
  };

  const currentIndex = chapters.findIndex((c) => c.id === currentChapter?.id);
  const hasNext = currentIndex < chapters.length - 1;
  const hasPrev = currentIndex > 0;
  const isLastChapter = currentIndex === chapters.length - 1;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.readerContainer, isWide && styles.readerContainerWide, { backgroundColor: settings.backgroundColor }]}>
        {showToc && chapters.length > 0 ? (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.tocContent}>
            <Text variant="headlineSmall" style={[styles.tocTitle, { color: settings.textColor }]}>
              {novel?.title}
            </Text>
            <Text variant="titleSmall" style={[styles.tocSubtitle, { color: settings.textColor }]}>
              {t('chapterList')} ({chapters.length})
            </Text>
            {chapters.map((ch, idx) => (
              <TouchableOpacity
                key={ch.id}
                onPress={() => handleSelectChapterFromToc(idx)}
              >
                <Surface style={styles.tocItem} elevation={1}>
                  <View style={styles.tocItemRow}>
                    <Text variant="titleMedium" style={styles.tocItemNumber}>
                      {ch.chapter_number}
                    </Text>
                    <View style={styles.tocItemInfo}>
                      <Text variant="bodyLarge" style={[styles.tocItemTitle, { color: settings.textColor }]}>
                        {ch.title}
                      </Text>
                      <Text variant="bodySmall" style={styles.tocItemMeta}>
                        {ch.word_count} {t('words')}
                      </Text>
                    </View>
                  </View>
                </Surface>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : currentChapter ? (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {/* Chapter Illustrations - shown first before text */}
            {chapterIllustrations.length > 0 && !editingChapter && (
              <View style={styles.illustrationHeader}>
                {chapterIllustrations.map((ill: any, index: number) => (
                  <TouchableOpacity
                    key={ill.id}
                    onPress={() => navigation.navigate('IllustrationDetail', { illustrationId: ill.id })}
                    style={styles.illustrationFullWrapper}
                  >
                    <Image
                      source={{ uri: `http://localhost:8000${ill.image_url}` }}
                      style={styles.illustrationFullImage}
                      resizeMode="cover"
                    />
                    {ill.description && (
                      <View style={styles.illustrationCaptionContainer}>
                        <Text style={[styles.illustrationFullCaption, { color: settings.textColor }]}>
                          {ill.description}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Chapter title and meta */}
            <Text variant="headlineSmall" style={[styles.chapterTitle, { color: settings.textColor }]}>
              {currentChapter.title}
            </Text>
            <Text variant="bodySmall" style={[styles.chapterMeta, { color: settings.textColor }]}>
              {t('chapterList')} {currentChapter.chapter_number} | {currentChapter.word_count} {t('words')}
            </Text>
            
            {editingChapter ? (
              <TextInput
                value={editContent}
                onChangeText={setEditContent}
                multiline
                style={[styles.editChapterInput, { color: settings.textColor }]}
                mode="flat"
                underlineColor="transparent"
              />
            ) : (
              /* Chapter content */
              <ChapterRenderer content={currentChapter.content} />
            )}

            {isLastChapter && !readOnly && (
              <Surface style={styles.continuePanel} elevation={2}>
                <Text variant="titleMedium" style={styles.continueTitle}>
                  {t('continueStory')}
                </Text>
                <Text variant="bodySmall" style={styles.continueHint}>
                  {t('continueStoryHint')}
                </Text>
                <View style={styles.quickActions}>
                  <Chip icon="arrow-right" onPress={() => handleQuickContinue('Continue the story naturally')} style={styles.continueChip}>{t('continue')}</Chip>
                  <Chip icon="flash" onPress={() => handleQuickContinue('Add a major plot twist')} style={styles.continueChip}>{t('addTwist')}</Chip>
                  <Chip icon="weather-night" onPress={() => handleQuickContinue('Make the story darker and more intense')} style={styles.continueChip}>{t('darker')}</Chip>
                  <Chip icon="snail" onPress={() => handleQuickContinue('Slow down the pace, add more detail')} style={styles.continueChip}>{t('slower')}</Chip>
                  <Chip icon="account-group" onPress={() => handleQuickContinue('Focus more on character development')} style={styles.continueChip}>{t('deeperCharacters')}</Chip>
                  <Chip icon="map-marker" onPress={() => handleQuickContinue('Introduce a new location or setting')} style={styles.continueChip}>{t('setting')}</Chip>
                </View>
                <TextInput
                  label={t('customDirection')}
                  value={userDirection}
                  onChangeText={setUserDirection}
                  placeholder={t('customDirectionPlaceholder')}
                  mode="outlined"
                  multiline
                  numberOfLines={2}
                  style={styles.inlineDirectionInput}
                />
                <Button
                  mode="contained"
                  onPress={() => handleSendDirectionAndContinue(userDirection)}
                  style={styles.continueButton}
                  icon="lightning-bolt"
                >
                  {t('generateNext')}
                </Button>
              </Surface>
            )}
          </ScrollView>
        ) : (
          <View style={styles.center}>
            <Text variant="headlineSmall">{t('noChaptersYet')}</Text>
            {!readOnly && (
              <Button mode="contained" onPress={handleGenerateNext} style={styles.button}>
                {t('generateFirstChapter')}
              </Button>
            )}
          </View>
        )}
      </View>

      <Surface style={styles.bottomBar} elevation={4}>
        <View style={styles.controls}>
          <IconButton
            icon="chevron-left"
            size={28}
            onPress={handlePrevChapter}
            disabled={!hasPrev || showToc}
          />
          <Button
            mode="outlined"
            onPress={() => showToc ? setChapterNavVisible(true) : setShowToc(true)}
            style={styles.chapterButton}
          >
            {showToc ? t('chapterList') : currentChapter ? `Ch. ${currentChapter.chapter_number}` : t('noChaptersYet')}
          </Button>
          <IconButton
            icon="chevron-right"
            size={28}
            onPress={handleNextChapter}
            disabled={!hasNext || showToc}
          />
        </View>
        <View style={styles.bottomControls}>
          <Button
            mode="text"
            icon="cog"
            onPress={() => setSettingsVisible(true)}
            style={styles.settingsButton}
          >
            {t('readingSettings')}
          </Button>
          {currentChapter && !showToc && !readOnly && (
            <Button
              mode="text"
              icon={editingChapter ? 'check' : 'pencil'}
              onPress={editingChapter ? handleSaveChapterEdit : () => {
                setEditContent(currentChapter.content || '');
                setEditingChapter(true);
              }}
              style={styles.settingsButton}
            >
              {editingChapter ? 'Save' : 'Edit'}
            </Button>
          )}
          {currentChapter && !showToc && (
            <Button
              mode="text"
              icon={bookmarked ? 'bookmark' : 'bookmark-outline'}
              onPress={handleToggleBookmark}
              style={styles.settingsButton}
            >
              {bookmarked ? 'Bookmarked' : 'Bookmark'}
            </Button>
          )}
          {currentChapter && !showToc && (
            <Button
              mode="text"
              icon="share-variant-outline"
              onPress={() => setShareProgressVisible(true)}
              style={styles.settingsButton}
            >
              {t('shareProgress')}
            </Button>
          )}
        </View>
      </Surface>

      {settingsVisible && (
        <Portal>
          <View style={styles.overlay}>
            <TouchableOpacity style={styles.overlayTouchable} onPress={() => setSettingsVisible(false)} />
            <ReaderSettingsPanel onClose={() => setSettingsVisible(false)} />
          </View>
        </Portal>
      )}

      <Portal>
        <Modal
          visible={chapterNavVisible}
          onDismiss={() => setChapterNavVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleMedium" style={styles.modalTitle}>
            {t('chapterList')}
          </Text>
          <ScrollView>
            {chapters.map((ch, idx) => (
              <TouchableOpacity key={ch.id} onPress={() => goToChapter(idx)}>
                <Surface
                  style={[
                    styles.chapterItem,
                    ch.id === currentChapter?.id && styles.chapterItemActive,
                  ]}
                >
                  <Text variant="bodyMedium">
                    {ch.chapter_number}. {ch.title}
                  </Text>
                </Surface>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Modal>
      </Portal>

      {/* Share Progress Dialog */}
      <Portal>
        <Modal
          visible={shareProgressVisible}
          onDismiss={() => !sharingProgress && setShareProgressVisible(false)}
          contentContainerStyle={styles.shareModal}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            {t('shareProgressTitle')}
          </Text>
          <Text variant="bodySmall" style={{ marginBottom: 16, color: '#666' }}>
            {t('shareProgressHint')}
          </Text>

          {currentChapter && (
            <View style={{ marginBottom: 16 }}>
              <Text variant="labelLarge" style={{ marginBottom: 4 }}>{t('currentChapter')}</Text>
              <Text variant="bodyMedium" style={{ fontWeight: '500' }}>
                Chapter {currentChapter.chapter_number}: {currentChapter.title}
              </Text>
            </View>
          )}

          <TextInput
            label={t('yourThoughts')}
            value={shareThoughts}
            onChangeText={setShareThoughts}
            placeholder={t('yourThoughtsPlaceholder')}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={{ marginBottom: 16 }}
          />

          <View style={{ marginBottom: 16 }}>
            <Text variant="labelLarge" style={{ marginBottom: 8 }}>{t('rating')}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setShareRating(star)}
                  style={{ padding: 4 }}
                >
                  <Text style={{ fontSize: 28 }}>
                    {star <= shareRating ? '⭐' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            <Button
              mode="outlined"
              onPress={() => {
                setShareProgressVisible(false);
                setShareThoughts('');
                setShareRating(0);
              }}
              disabled={sharingProgress}
            >
              {t('cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleShareProgress}
              loading={sharingProgress}
              disabled={sharingProgress}
              icon="share-variant"
            >
              {t('shareToFeed')}
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
    backgroundColor: '#fafafa',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  readerContainer: {
    flex: 1,
  },
  readerContainerWide: {
    alignSelf: 'center',
    maxWidth: 800,
    width: '100%',
  },
  scrollView: {
    flex: 1,
    overflow: 'scroll',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  chapterTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  chapterMeta: {
    marginBottom: 20,
    color: '#888',
  },
  content: {
    lineHeight: 28,
    fontSize: 16,
  },
  bottomBar: {
    padding: 8,
    backgroundColor: '#fff',
  },
  bottomControls: {
    alignItems: 'center',
    marginTop: 4,
  },
  settingsButton: {
    marginHorizontal: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 100,
  },
  overlayTouchable: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterButton: {
    marginHorizontal: 8,
  },
  continuePanel: {
    marginTop: 32,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  continueTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  continueHint: {
    color: '#666',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  continueChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  inlineDirectionInput: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  continueButton: {
    marginTop: 4,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  chapterItem: {
    padding: 12,
    marginBottom: 4,
    borderRadius: 4,
  },
  chapterItemActive: {
    backgroundColor: '#e3f2fd',
  },
  directionInput: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 8,
  },
  tocContent: {
    padding: 20,
    paddingBottom: 40,
  },
  tocTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tocSubtitle: {
    marginBottom: 20,
    color: '#888',
  },
  tocItem: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  tocItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tocItemNumber: {
    width: 40,
    fontWeight: 'bold',
    color: '#1d9bf0',
  },
  tocItemInfo: {
    flex: 1,
  },
  tocItemTitle: {
    fontWeight: '600',
  },
  tocItemMeta: {
    color: '#888',
    marginTop: 2,
  },
  editChapterInput: {
    minHeight: 300,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
    backgroundColor: 'transparent',
  },
  illustrationSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  illustrationSectionEnd: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 2,
    borderTopColor: '#d0d0d0',
  },
  illustrationHeader: {
    marginBottom: 24,
  },
  illustrationFullWrapper: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  illustrationFullImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#e0e0e0',
  },
  illustrationCaptionContainer: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  illustrationFullCaption: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  illustrationSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  illustrationWrapper: {
    marginRight: 12,
    maxWidth: 200,
  },
  illustrationImage: {
    width: 200,
    height: 280,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  illustrationCaption: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  illustrationThumb: {
    width: 120,
    height: 180,
    borderRadius: 8,
    marginRight: 12,
  },
  shareModal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
});
