import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, ActivityIndicator, Surface, Card, Chip } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { generationApi } from '../api/generation';
import { useI18n } from '../i18n/I18nContext';
import { XColors } from '../theme/xStyle';
import OutlineEditor from '../components/OutlineEditor';

type GenerationScreenProps = StackScreenProps<RootStackParamList, 'Generation'>;

interface ChapterPlan {
  chapter_number: number;
  title: string;
  summary: string;
  key_points: string;
  continuity: string;
}

interface GeneratedChapter {
  plan: ChapterPlan;
  content: string;
  streaming: boolean;
  complete: boolean;
}

/** Extract readable text from AI's JSON response for real-time display.
 *  The AI streams JSON like: {"title": "...", "content": "some text..."}
 *  While streaming, the JSON is incomplete. We try to extract the content field text.
 */
function extractReadableContent(raw: string): string {
  if (!raw.trim()) return '';

  // Strip markdown code fences
  let text = raw.trim();
  if (text.startsWith('```json')) text = text.slice(7);
  else if (text.startsWith('```')) text = text.slice(3);
  if (text.endsWith('```')) text = text.slice(0, -3);
  text = text.trim();

  // Try to extract the "content" value from partial JSON
  const contentMatch = text.match(/"content"\s*:\s*"([\s\S]*)/);
  if (contentMatch) {
    let content = contentMatch[1];
    // Remove trailing incomplete JSON artifacts
    content = content.replace(/"?\s*}?\s*$/, '');
    // Unescape common JSON escape sequences
    content = content.replace(/\\n/g, '\n');
    content = content.replace(/\\t/g, '\t');
    content = content.replace(/\\"/g, '"');
    content = content.replace(/\\\\/g, '\\');
    return content;
  }

  // If it doesn't look like JSON at all, return raw
  if (!text.startsWith('{')) {
    return raw;
  }

  // JSON structure present but no content field yet - show nothing
  return '';
}

export default function GenerationScreen({ navigation, route }: GenerationScreenProps) {
  const { t } = useI18n();
  const { novelId, sessionId, type, outline: routeOutline } = route.params;

  // Outline review state
  const [outlineReviewMode, setOutlineReviewMode] = useState(type === 'initial' && !!routeOutline);
  const [outline, setOutline] = useState(routeOutline || '');
  const [savingOutline, setSavingOutline] = useState(false);

  // Per-chapter generation state
  const [chapterPlans, setChapterPlans] = useState<ChapterPlan[]>([]);
  const [generatedChapters, setGeneratedChapters] = useState<GeneratedChapter[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(-1);
  const [generating, setGenerating] = useState(false);
  const [allComplete, setAllComplete] = useState(false);

  // Interaction state (Phase 2)
  const [userDirection, setUserDirection] = useState('');
  const [showDirectionInput, setShowDirectionInput] = useState(false);
  const [phase2Text, setPhase2Text] = useState('');
  const [error, setError] = useState('');
  const [stopped, setStopped] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: outlineReviewMode ? t('reviewOutline') : t('generating'),
    });
  }, [navigation, t, outlineReviewMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Auto-start generation when screen loads
  useEffect(() => {
    if (outlineReviewMode) return; // Wait for user to confirm outline
    if (type === 'initial') {
      // Phase 1: Start per-chapter generation
      startPerChapterGeneration();
    } else if (type === 'continue') {
      // Phase 2: Start continuation stream
      startPhase2Stream();
    }
  }, [outlineReviewMode]);

  // Auto-scroll as new content streams in
  useEffect(() => {
    if (scrollViewRef.current && generating) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [generatedChapters, generating]);

  // Start generating the next chapter in sequence
  const startNextChapter = useCallback(async (plans: ChapterPlan[], alreadyGenerated: GeneratedChapter[], startIndex: number) => {
    if (startIndex >= plans.length) {
      setGenerating(false);
      setAllComplete(true);
      return;
    }

    const plan = plans[startIndex];
    setCurrentChapterIndex(startIndex);
    setGenerating(true);
    setError('');
    setStopped(false);

    const newChapter: GeneratedChapter = {
      plan,
      content: '',
      streaming: true,
      complete: false,
    };
    const updatedChapters = [...alreadyGenerated, newChapter];
    setGeneratedChapters(updatedChapters);

    try {
      console.log('[GenScreen] startNextChapter - chapter', startIndex, 'of', plans.length);
      eventSourceRef.current = await generationApi.streamSingleChapter(
        novelId,
        startIndex,
        (chunk: string) => {
          // Append raw chunk and update the current chapter's content
          setGeneratedChapters(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0) {
              const newContent = updated[lastIdx].content + chunk;
              if (newContent.length % 500 < chunk.length) {
                console.log('[GenScreen] Chapter', startIndex, 'content length:', newContent.length);
              }
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: newContent,
              };
            }
            return updated;
          });
        },
        () => {
          // Chapter done - mark as complete
          console.log('[GenScreen] Chapter', startIndex, 'complete');
          setGeneratedChapters(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0) {
              updated[lastIdx] = {
                ...updated[lastIdx],
                streaming: false,
                complete: true,
              };
            }
            return updated;
          });

          // Auto-continue to next chapter after a brief pause
          setTimeout(() => {
            // Get current generated chapters from state
            setGeneratedChapters(currentChapters => {
              startNextChapter(plans, currentChapters, startIndex + 1);
              return currentChapters;
            });
          }, 500);
        },
        (err) => {
          setError(err);
          setGenerating(false);
          setGeneratedChapters(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0) {
              updated[lastIdx] = {
                ...updated[lastIdx],
                streaming: false,
                complete: false,
              };
            }
            return updated;
          });
        }
      );
    } catch (err: any) {
      setError(err.message || t('createFailed'));
      setGenerating(false);
    }
  }, [novelId]);

  // Start Phase 1: per-chapter generation from outline
  const startPerChapterGeneration = async () => {
    setGenerating(true);
    setError('');
    console.log('[GenScreen] startPerChapterGeneration called, novelId:', novelId);
    try {
      const res = await generationApi.getOutlineChapters(novelId);
      const plans = res.data.chapters;
      console.log('[GenScreen] Got outline chapters:', plans?.length);
      if (!plans || plans.length === 0) {
        setError(t('createFailed'));
        setGenerating(false);
        return;
      }
      setChapterPlans(plans);
      setGeneratedChapters([]);
      startNextChapter(plans, [], 0);
    } catch (err: any) {
      console.error('[GenScreen] startPerChapterGeneration error:', err);
      setError(err.response?.data?.detail || t('createFailed'));
      setGenerating(false);
    }
  };

  // Phase 2: continuation stream
  const startPhase2Stream = async () => {
    setGenerating(true);
    setPhase2Text('');
    setError('');
    setStopped(false);

    eventSourceRef.current = await generationApi.streamContinue(
      sessionId,
      undefined,
      (chunk: string) => {
        setPhase2Text(prev => prev + chunk);
      },
      () => {
        setGenerating(false);
      },
      (err) => {
        setError(err);
        setGenerating(false);
      }
    );
  };

  const handleStopGeneration = async () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    try {
      await generationApi.cancel(sessionId);
    } catch (e) {
      console.log('Cancel request failed or session not found');
    }
    setGenerating(false);
    setStopped(true);
    // Mark current chapter as not streaming
    setGeneratedChapters(prev => {
      const updated = [...prev];
      const lastIdx = updated.length - 1;
      if (lastIdx >= 0 && updated[lastIdx].streaming) {
        updated[lastIdx] = {
          ...updated[lastIdx],
          streaming: false,
          complete: false,
        };
      }
      return updated;
    });
  };

  const handleConfirmOutline = async () => {
    if (!outline.trim()) return;
    setSavingOutline(true);
    try {
      console.log('[GenScreen] handleConfirmOutline - saving outline, sessionId:', sessionId);
      await generationApi.updateOutline(sessionId, outline);
      // Setting outlineReviewMode to false will trigger the useEffect that auto-starts generation
      setOutlineReviewMode(false);
    } catch (err: any) {
      console.error('[GenScreen] handleConfirmOutline error:', err);
      setError(err.response?.data?.detail || t('saveFailed'));
    } finally {
      setSavingOutline(false);
    }
  };

  const handleReadNow = () => {
    navigation.replace('Reader', { novelId });
  };

  const handleSendDirection = async () => {
    if (!userDirection.trim()) return;
    try {
      await generationApi.interact(sessionId, 'direction', userDirection);
      setShowDirectionInput(false);
      setUserDirection('');
      setGenerating(true);
      setPhase2Text('');
      setError('');

      eventSourceRef.current = await generationApi.streamContinue(
        sessionId,
        userDirection,
        (chunk: string) => {
          setPhase2Text(prev => prev + chunk);
        },
        () => {
          setGenerating(false);
        },
        (err) => {
          setError(err);
          setGenerating(false);
        }
      );
    } catch (err: any) {
      setError(err.response?.data?.detail || t('createFailed'));
    }
  };

  const handleQuickAction = async (action: string) => {
    setUserDirection(action);
    await handleSendDirection();
  };

  // Progress info
  const progressText = currentChapterIndex >= 0 && chapterPlans.length > 0
    ? `${t('chapter')} ${currentChapterIndex + 1}/${chapterPlans.length}`
    : '';

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={2}>
        <Text variant="titleMedium">
          {type === 'initial'
            ? t('phase1Generating')
            : t('phase2Generating')}
        </Text>
        <Text variant="bodySmall" style={styles.phaseHint}>
          {type === 'initial'
            ? t('phase1Hint')
            : t('phase2Hint')}
        </Text>
        {generating && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={XColors.primary} />
            <Text variant="bodySmall" style={styles.loadingText}>
              {type === 'initial' ? progressText : t('aiIsWriting')}
            </Text>
          </View>
        )}
        {generating && (
          <Button
            mode="outlined"
            onPress={handleStopGeneration}
            style={styles.stopButton}
            icon="stop"
            textColor="#c62828"
          >
            {t('stopGeneration')}
          </Button>
        )}
        {stopped && (
          <Text variant="bodySmall" style={styles.stoppedText}>
            {t('stopped')}
          </Text>
        )}
        {allComplete && (
          <Text variant="bodySmall" style={styles.completeText}>
            {t('generationComplete')}
          </Text>
        )}
      </Surface>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {outlineReviewMode ? (
          <View style={styles.reviewContainer}>
            <Text variant="titleMedium" style={styles.reviewTitle}>
              {t('reviewOutlineHint')}
            </Text>
            <OutlineEditor
              outline={outline}
              onOutlineChange={setOutline}
            />
          </View>
        ) : type === 'initial' ? (
          // Phase 1: Per-chapter display
          <View style={styles.chaptersContainer}>
            {generatedChapters.map((ch, idx) => (
              <Card key={idx} style={[
                styles.chapterCard,
                ch.streaming && styles.chapterCardStreaming,
                ch.complete && styles.chapterCardComplete,
              ]}>
                <Card.Content>
                  <View style={styles.chapterHeader}>
                    <Text variant="titleMedium" style={styles.chapterTitle}>
                      {`${t('chapter')} ${ch.plan.chapter_number}`}
                      {ch.plan.title ? `: ${ch.plan.title}` : ''}
                    </Text>
                    {ch.streaming && (
                      <ActivityIndicator size="small" color={XColors.primary} />
                    )}
                    {ch.complete && (
                      <Text variant="bodySmall" style={styles.chapterDoneBadge}>
                        \u2713
                      </Text>
                    )}
                  </View>
                  {ch.plan.summary && !ch.content && (
                    <Text variant="bodySmall" style={styles.chapterSummary}>
                      {ch.plan.summary}
                    </Text>
                  )}
                  {ch.content ? (
                    <>
                      <Text variant="bodyMedium" style={styles.chapterContent}>
                        {extractReadableContent(ch.content)}
                      </Text>
                      <Text variant="bodySmall" style={styles.chapterWordCount}>
                        {extractReadableContent(ch.content).split(/\s+/).filter(Boolean).length} {t('words')}
                      </Text>
                    </>
                  ) : null}
                </Card.Content>
              </Card>
            ))}
            {generating && (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={XColors.primary} />
                <Text variant="bodyMedium" style={styles.waitingText}>
                  {generatedChapters.length === 0 ? t('waitingForAI') : t('aiIsWriting')}
                </Text>
              </View>
            )}
            {allComplete && (
              <Text variant="bodyMedium" style={styles.allDoneText}>
                {t('generationComplete')}
              </Text>
            )}
          </View>
        ) : type === 'continue' && phase2Text ? (
          <Text variant="bodyLarge" style={styles.generatedText}>
            {phase2Text}
          </Text>
        ) : type === 'continue' ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={XColors.primary} />
            <Text variant="bodyMedium" style={styles.waitingText}>
              {t('waitingForAI')}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {error ? (
        <Surface style={styles.errorBar}>
          <Text variant="bodySmall" style={styles.errorText}>{error}</Text>
        </Surface>
      ) : null}

      <Surface style={styles.interactionBar} elevation={4}>
        {outlineReviewMode ? (
          <Button
            mode="contained"
            onPress={handleConfirmOutline}
            loading={savingOutline}
            disabled={savingOutline || !outline.trim()}
            style={styles.actionButton}
            icon="check-circle"
            buttonColor={XColors.primary}
          >
            {t('confirmAndGenerate')}
          </Button>
        ) : allComplete || (stopped && generatedChapters.length > 0) ? (
          <Button
            mode="contained"
            onPress={handleReadNow}
            style={styles.actionButton}
            icon="book-open"
            buttonColor={XColors.primary}
          >
            {t('readNow')}
          </Button>
        ) : type === 'continue' && !generating ? (
          <>
            <View style={styles.quickActions}>
              <Chip icon="arrow-right" onPress={() => handleQuickAction('Continue the story naturally')} style={styles.chip}>
                {t('continue')}
              </Chip>
              <Chip icon="weather-night" onPress={() => handleQuickAction('Make the story darker and more intense')} style={styles.chip}>
                {t('darker')}
              </Chip>
              <Chip icon="flash" onPress={() => handleQuickAction('Add more suspense and tension')} style={styles.chip}>
                {t('moreSuspense')}
              </Chip>
            </View>
            <Button
              mode="contained"
              onPress={handleReadNow}
              style={styles.actionButton}
              icon="book-open"
              buttonColor={XColors.primary}
            >
              {t('readNow')}
            </Button>
          </>
        ) : null}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
  },
  phaseHint: {
    marginTop: 6,
    color: '#888',
  },
  scrollView: {
    flex: 1,
    overflow: 'scroll',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  generatedText: {
    lineHeight: 28,
    fontSize: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  waitingText: {
    marginTop: 16,
    color: '#888',
  },
  errorBar: {
    padding: 12,
    backgroundColor: '#ffebee',
  },
  errorText: {
    color: '#c62828',
  },
  interactionBar: {
    padding: 12,
    backgroundColor: '#fff',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
  },
  stopButton: {
    marginTop: 12,
    borderColor: '#c62828',
  },
  stoppedText: {
    marginTop: 8,
    color: '#c62828',
  },
  completeText: {
    marginTop: 8,
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  reviewContainer: {
    padding: 16,
  },
  reviewTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  chaptersContainer: {
    paddingBottom: 20,
  },
  chapterCard: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chapterCardStreaming: {
    borderColor: XColors.primary,
    borderWidth: 2,
  },
  chapterCardComplete: {
    borderColor: '#4caf50',
    borderWidth: 1,
  },
  chapterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chapterTitle: {
    fontWeight: 'bold',
    color: XColors.primary,
    flex: 1,
  },
  chapterDoneBadge: {
    color: '#4caf50',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  chapterSummary: {
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  chapterContent: {
    lineHeight: 24,
    color: '#333',
  },
  chapterWordCount: {
    color: '#aaa',
    marginTop: 8,
  },
  allDoneText: {
    textAlign: 'center',
    color: '#2e7d32',
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 20,
  },
});
