import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput, Card, Divider, IconButton, Surface } from 'react-native-paper';
import { useI18n } from '../i18n/I18nContext';
import { XColors, XSpacing, XBorderRadius, XTypography } from '../theme/xStyle';

// --- Outline Data Model ---
export interface OutlineChapter {
  chapterNumber: number;
  title: string;
  summary: string;
  keyPoints: string;
  continuity: string;
}

// --- Helper: unescape \n in a string ---
function unescapeText(text: string): string {
  return text.replace(/\\n/g, '\n');
}

// --- Helper: try parse JSON outline ---
function tryParseJsonOutline(text: string): OutlineChapter[] | null {
  let cleaned = text.trim();
  // Remove markdown code fences
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  try {
    const data = JSON.parse(cleaned);

    // Case 1: Array of chapter objects
    if (Array.isArray(data)) {
      return data.map((item: any, idx: number) => ({
        chapterNumber: item.chapter_number || item.chapterNumber || item.chapter || (idx + 1),
        title: item.title || '',
        summary: unescapeText(item.summary || item.description || item.content || ''),
        keyPoints: unescapeText(item.key_points || item.keyPoints || item.key_points_and_moments || ''),
        continuity: unescapeText(item.continuity || item.continuity_notes || ''),
      }));
    }

    // Case 2: Object with chapters array
    if (data && typeof data === 'object') {
      const chaptersArr = data.chapters || data.outline || null;
      if (Array.isArray(chaptersArr)) {
        return chaptersArr.map((item: any, idx: number) => ({
          chapterNumber: item.chapter_number || item.chapterNumber || item.chapter || (idx + 1),
          title: item.title || '',
          summary: unescapeText(item.summary || item.description || ''),
          keyPoints: unescapeText(item.key_points || item.keyPoints || ''),
          continuity: unescapeText(item.continuity || item.continuity_notes || ''),
        }));
      }
      // Case 3: Object with content field containing markdown chapter headers
      // e.g. {"title": "Novel Name", "content": "### Chapter 1: ...\n### Chapter 2: ..."}
      if (data.content && typeof data.content === 'string') {
        const parsed = parseMarkdownChapters(unescapeText(data.content));
        if (parsed.length > 1 || (parsed.length === 1 && parsed[0].title)) {
          return parsed;
        }
      }
      // Case 4: Single chapter object without content field
      if (data.title && !data.content) {
        return [{
          chapterNumber: 1,
          title: data.title || '',
          summary: unescapeText(data.summary || ''),
          keyPoints: unescapeText(data.key_points || data.keyPoints || ''),
          continuity: unescapeText(data.continuity || ''),
        }];
      }
    }
  } catch {
    // Not valid JSON, fall through
  }
  return null;
}

// --- Helper: parse markdown-formatted chapter headers ---
function parseMarkdownChapters(text: string): OutlineChapter[] {
  const chapters: OutlineChapter[] = [];
  // Match both '### Chapter N: Title' and plain 'Chapter N: Title'
  const chapterRegex = /(?:###\s*)?Chapter\s+(\d+)\s*:\s*(.+)/gi;
  const matches: { index: number; number: number; title: string }[] = [];
  let match;

  while ((match = chapterRegex.exec(text)) !== null) {
    matches.push({
      index: match.index,
      number: parseInt(match[1]),
      title: match[2].trim().replace(/\*\*/g, ''),
    });
  }

  if (matches.length === 0) {
    return [{ chapterNumber: 1, title: '', summary: text.trim(), keyPoints: '', continuity: '' }];
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const body = text.substring(start, end).trim();
    const headerLine = body.split('\n')[0];
    const contentBody = body.substring(headerLine.length).trim();

    const chapter: OutlineChapter = {
      chapterNumber: matches[i].number,
      title: matches[i].title,
      summary: '',
      keyPoints: '',
      continuity: '',
    };

    // Match patterns like: - **Summary:** text  or  Summary: text
    const summaryMatch = contentBody.match(/-?\s*\*{0,2}Summary\*{0,2}:\*{0,2}\s*([\s\S]*?)(?=-?\s*\*{0,2}(?:Key\s*Points?|Continuity)\*{0,2}:\*{0,2}\s*)/i);
    const keyPointsMatch = contentBody.match(/-?\s*\*{0,2}Key\s*Points?\*{0,2}:\*{0,2}\s*([\s\S]*?)(?=-?\s*\*{0,2}Continuity\*{0,2}:\*{0,2}\s*)/i);
    const continuityMatch = contentBody.match(/-?\s*\*{0,2}Continuity\*{0,2}:\*{0,2}\s*([\s\S]*?)$/i);

    // Fallback without markdown bold
    if (!summaryMatch) {
      const sm = contentBody.match(/-?\s*Summary\s*:\s*([\s\S]*?)(?=-?\s*(?:Key\s*Points?|Continuity)\s*:|$)/i);
      if (sm) chapter.summary = sm[1].trim();
    } else {
      chapter.summary = summaryMatch[1].trim();
    }
    if (!keyPointsMatch) {
      const km = contentBody.match(/-?\s*Key\s*Points?\s*:\s*([\s\S]*?)(?=-?\s*Continuity\s*:|$)/i);
      if (km) chapter.keyPoints = km[1].trim();
    } else {
      chapter.keyPoints = keyPointsMatch[1].trim();
    }
    if (!continuityMatch) {
      const cm = contentBody.match(/-?\s*Continuity\s*:\s*([\s\S]*?)$/i);
      if (cm) chapter.continuity = cm[1].trim();
    } else {
      chapter.continuity = continuityMatch[1].trim();
    }

    if (!chapter.summary && !chapter.keyPoints && !chapter.continuity && contentBody) {
      chapter.summary = contentBody;
    }

    chapters.push(chapter);
  }

  return chapters;
}

// --- Parser: outline text → structured chapters ---
export function parseOutline(text: string): OutlineChapter[] {
  if (!text || !text.trim()) return [];

  // Unescape any literal \n in the raw text first
  const unescaped = unescapeText(text);

  // Try JSON format first
  const jsonResult = tryParseJsonOutline(unescaped);
  if (jsonResult && jsonResult.length > 0) return jsonResult;

  // Fallback: parse plain text with "Chapter N:" pattern
  const chapters: OutlineChapter[] = [];
  const chapterRegex = /Chapter\s+(\d+)\s*:\s*(.+)/gi;
  const matches: { index: number; number: number; title: string }[] = [];
  let match;

  while ((match = chapterRegex.exec(unescaped)) !== null) {
    matches.push({
      index: match.index,
      number: parseInt(match[1]),
      title: match[2].trim(),
    });
  }

  if (matches.length === 0) {
    // No "Chapter N:" pattern found — treat entire text as a single chapter
    return [{ chapterNumber: 1, title: '', summary: unescaped.trim(), keyPoints: '', continuity: '' }];
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : unescaped.length;
    const body = unescaped.substring(start, end).trim();

    // Remove the chapter header line
    const headerLine = body.split('\n')[0];
    const contentBody = body.substring(headerLine.length).trim();

    const chapter: OutlineChapter = {
      chapterNumber: matches[i].number,
      title: matches[i].title,
      summary: '',
      keyPoints: '',
      continuity: '',
    };

    // Parse subsections
    const summaryMatch = contentBody.match(/-?\s*Summary\s*:\s*([\s\S]*?)(?=-?\s*(?:Key\s*Points?|Continuity)\s*:|$)/i);
    const keyPointsMatch = contentBody.match(/-?\s*Key\s*Points?\s*:\s*([\s\S]*?)(?=-?\s*Continuity\s*:|$)/i);
    const continuityMatch = contentBody.match(/-?\s*Continuity\s*:\s*([\s\S]*?)$/i);

    if (summaryMatch) chapter.summary = summaryMatch[1].trim();
    if (keyPointsMatch) chapter.keyPoints = keyPointsMatch[1].trim();
    if (continuityMatch) chapter.continuity = continuityMatch[1].trim();

    // If no subsections were found, put everything in summary
    if (!chapter.summary && !chapter.keyPoints && !chapter.continuity && contentBody) {
      chapter.summary = contentBody;
    }

    chapters.push(chapter);
  }

  return chapters;
}

// --- Serializer: structured chapters → outline text ---
export function serializeOutline(chapters: OutlineChapter[]): string {
  return chapters.map((ch) => {
    let text = `Chapter ${ch.chapterNumber}: ${ch.title}`;
    if (ch.summary) text += `\n- Summary: ${ch.summary}`;
    if (ch.keyPoints) text += `\n- Key Points: ${ch.keyPoints}`;
    if (ch.continuity) text += `\n- Continuity: ${ch.continuity}`;
    return text;
  }).join('\n\n');
}

// --- Component Props ---
interface OutlineEditorProps {
  outline: string;
  onOutlineChange: (text: string) => void;
}

// --- Component ---
export default function OutlineEditor({ outline, onOutlineChange }: OutlineEditorProps) {
  const { t } = useI18n();
  const [chapters, setChapters] = useState<OutlineChapter[]>([]);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(0);

  // Parse outline when it changes externally
  useEffect(() => {
    setChapters(parseOutline(outline));
  }, []);

  const updateChapter = (index: number, field: keyof OutlineChapter, value: string) => {
    const updated = [...chapters];
    updated[index] = { ...updated[index], [field]: value };
    setChapters(updated);
    onOutlineChange(serializeOutline(updated));
  };

  const addChapter = () => {
    const nextNum = chapters.length > 0 ? Math.max(...chapters.map(c => c.chapterNumber)) + 1 : 1;
    const updated = [...chapters, {
      chapterNumber: nextNum,
      title: '',
      summary: '',
      keyPoints: '',
      continuity: '',
    }];
    setChapters(updated);
    setExpandedChapter(updated.length - 1);
    onOutlineChange(serializeOutline(updated));
  };

  const removeChapter = (index: number) => {
    const updated = chapters.filter((_, i) => i !== index);
    // Renumber
    updated.forEach((ch, i) => { ch.chapterNumber = i + 1; });
    setChapters(updated);
    onOutlineChange(serializeOutline(updated));
  };

  const toggleExpand = (index: number) => {
    setExpandedChapter(expandedChapter === index ? null : index);
  };

  return (
    <View style={styles.container}>
      {chapters.map((ch, idx) => {
        const isExpanded = expandedChapter === idx;
        return (
          <Surface key={idx} style={styles.chapterCard} elevation={isExpanded ? 2 : 1}>
            {/* Chapter Header — always visible */}
            <TouchableOpacity onPress={() => toggleExpand(idx)} activeOpacity={0.7}>
              <View style={styles.chapterHeader}>
                <View style={styles.chapterBadge}>
                  <Text style={styles.chapterBadgeText}>{ch.chapterNumber}</Text>
                </View>
                {isExpanded ? (
                  <TextInput
                    value={ch.title}
                    onChangeText={(text) => updateChapter(idx, 'title', text)}
                    mode="outlined"
                    dense
                    style={styles.titleInput}
                    placeholder={t('chapterTitlePlaceholder')}
                    outlineColor={XColors.border}
                    activeOutlineColor={XColors.primary}
                  />
                ) : (
                  <Text variant="titleMedium" style={styles.chapterTitleCollapsed} numberOfLines={1}>
                    {ch.title || t('untitledChapter')}
                  </Text>
                )}
                <View style={styles.headerActions}>
                  <IconButton
                    icon={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    onPress={() => toggleExpand(idx)}
                    style={styles.expandBtn}
                  />
                  {chapters.length > 1 && (
                    <IconButton
                      icon="close-circle-outline"
                      size={18}
                      iconColor="#e0245e"
                      onPress={() => removeChapter(idx)}
                      style={styles.removeBtn}
                    />
                  )}
                </View>
              </View>
            </TouchableOpacity>

            {/* Expanded content — editable fields */}
            {isExpanded && (
              <View style={styles.chapterBody}>
                <Divider style={styles.divider} />

                <Text variant="labelMedium" style={styles.fieldLabel}>
                  {t('summary')}
                </Text>
                <TextInput
                  value={ch.summary}
                  onChangeText={(text) => updateChapter(idx, 'summary', text)}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  style={styles.fieldInput}
                  outlineColor={XColors.border}
                  activeOutlineColor={XColors.primary}
                  placeholder={t('summaryPlaceholder')}
                />

                <Text variant="labelMedium" style={styles.fieldLabel}>
                  {t('keyPoints')}
                </Text>
                <TextInput
                  value={ch.keyPoints}
                  onChangeText={(text) => updateChapter(idx, 'keyPoints', text)}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  style={styles.fieldInput}
                  outlineColor={XColors.border}
                  activeOutlineColor={XColors.primary}
                  placeholder={t('keyPointsPlaceholder')}
                />

                <Text variant="labelMedium" style={styles.fieldLabel}>
                  {t('continuity')}
                </Text>
                <TextInput
                  value={ch.continuity}
                  onChangeText={(text) => updateChapter(idx, 'continuity', text)}
                  mode="outlined"
                  multiline
                  numberOfLines={2}
                  style={styles.fieldInput}
                  outlineColor={XColors.border}
                  activeOutlineColor={XColors.primary}
                  placeholder={t('continuityPlaceholder')}
                />
              </View>
            )}

            {/* Collapsed preview */}
            {!isExpanded && ch.summary && (
              <View style={styles.collapsedPreview}>
                <Text variant="bodySmall" style={styles.previewText} numberOfLines={2}>
                  {ch.summary}
                </Text>
              </View>
            )}
          </Surface>
        );
      })}

      <TouchableOpacity onPress={addChapter} style={styles.addChapterBtn} activeOpacity={0.7}>
        <IconButton icon="plus-circle-outline" size={20} iconColor={XColors.primary} style={styles.addIcon} />
        <Text style={styles.addChapterText}>{t('addChapter')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
  },
  chapterCard: {
    marginBottom: 12,
    borderRadius: XBorderRadius.lg,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: XSpacing.md,
    paddingRight: XSpacing.xs,
  },
  chapterBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: XColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: XSpacing.sm,
  },
  chapterBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  titleInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: '#f8f9fa',
  },
  chapterTitleCollapsed: {
    flex: 1,
    fontWeight: '600',
    color: XColors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandBtn: {
    margin: 0,
  },
  removeBtn: {
    margin: 0,
  },
  chapterBody: {
    padding: XSpacing.md,
    paddingTop: 0,
  },
  divider: {
    marginBottom: XSpacing.md,
  },
  fieldLabel: {
    color: XColors.textSecondary,
    marginBottom: 4,
    marginTop: 8,
    fontWeight: '600',
  },
  fieldInput: {
    backgroundColor: '#f8f9fa',
    marginBottom: 4,
    textAlignVertical: 'top',
  },
  collapsedPreview: {
    paddingHorizontal: XSpacing.md,
    paddingBottom: XSpacing.sm,
  },
  previewText: {
    color: XColors.textSecondary,
    lineHeight: 18,
  },
  addChapterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: XSpacing.md,
    borderRadius: XBorderRadius.lg,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: XColors.border,
    backgroundColor: '#fafbfc',
  },
  addIcon: {
    margin: 0,
    marginRight: 4,
  },
  addChapterText: {
    color: XColors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});


// ============================================================================
// OutlineViewer — Read-only structured outline display
// ============================================================================
interface OutlineViewerProps {
  outline: string;
}

export function OutlineViewer({ outline }: OutlineViewerProps) {
  const chapters = parseOutline(outline);

  if (chapters.length === 0) return null;

  return (
    <View style={viewerStyles.container}>
      {chapters.map((ch, idx) => (
        <View key={idx} style={viewerStyles.chapterBlock}>
          {/* Chapter header */}
          <View style={viewerStyles.chapterHeader}>
            <View style={viewerStyles.chapterBadge}>
              <Text style={viewerStyles.chapterBadgeText}>{ch.chapterNumber}</Text>
            </View>
            <Text variant="titleMedium" style={viewerStyles.chapterTitle}>
              {ch.title || `Chapter ${ch.chapterNumber}`}
            </Text>
          </View>

          {/* Summary */}
          {ch.summary ? (
            <View style={viewerStyles.section}>
              <Text variant="labelSmall" style={viewerStyles.sectionLabel}>Summary</Text>
              <Text variant="bodySmall" style={viewerStyles.sectionText}>{ch.summary}</Text>
            </View>
          ) : null}

          {/* Key Points */}
          {ch.keyPoints ? (
            <View style={viewerStyles.section}>
              <Text variant="labelSmall" style={viewerStyles.sectionLabel}>Key Points</Text>
              <Text variant="bodySmall" style={viewerStyles.sectionText}>{ch.keyPoints}</Text>
            </View>
          ) : null}

          {/* Continuity */}
          {ch.continuity ? (
            <View style={viewerStyles.section}>
              <Text variant="labelSmall" style={viewerStyles.sectionLabel}>Continuity</Text>
              <Text variant="bodySmall" style={viewerStyles.sectionText}>{ch.continuity}</Text>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const viewerStyles = StyleSheet.create({
  container: {
    paddingBottom: 8,
  },
  chapterBlock: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  chapterBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: XColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: XSpacing.sm,
  },
  chapterBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  chapterTitle: {
    fontWeight: '700',
    color: XColors.textPrimary,
  },
  section: {
    marginLeft: 34,
    marginBottom: 6,
  },
  sectionLabel: {
    color: XColors.primary,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sectionText: {
    color: XColors.textSecondary,
    lineHeight: 20,
  },
});
