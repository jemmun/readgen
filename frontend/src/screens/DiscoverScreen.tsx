import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, ActivityIndicator, Chip, Surface, Card } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { novelsApi } from '../api/novels';
import { useI18n } from '../i18n/I18nContext';
import { XColors, XTypography, XSpacing, XBorderRadius } from '../theme/xStyle';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Novel } from '../types';

type DiscoverNavigationProp = StackNavigationProp<RootStackParamList, 'NovelDetail'>;

export default function DiscoverScreen() {
  const { t } = useI18n();
  const navigation = useNavigation<DiscoverNavigationProp>();
  
  const [newReleases, setNewReleases] = useState<Novel[]>([]);
  const [editorPicks, setEditorPicks] = useState<Novel[]>([]);
  const [trendingNew, setTrendingNew] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [genres, setGenres] = useState<string[]>([]);

  useEffect(() => {
    loadGenres();
    loadData();
  }, [selectedGenre]);

  const loadGenres = async () => {
    try {
      const res = await novelsApi.genres();
      setGenres(res.data.genres);
    } catch (error) {
      console.error('Failed to load genres:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [newRes, editorRes, trendingRes] = await Promise.all([
        novelsApi.getNewReleases({ limit: 10, genre: selectedGenre || undefined }),
        novelsApi.getEditorPicks({ limit: 8, genre: selectedGenre || undefined }),
        novelsApi.getTrendingNew({ limit: 10 }),
      ]);
      setNewReleases(newRes.data);
      setEditorPicks(editorRes.data);
      setTrendingNew(trendingRes.data);
    } catch (error) {
      console.error('Failed to load discover data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleNovelPress = (novelId: number) => {
    navigation.navigate('NovelDetail', { novelId });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={XColors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('discover')}</Text>
        <Text style={styles.headerSubtitle}>{t('discoverSubtitle')}</Text>
      </View>

      {/* Genre Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreScroll}>
        <Chip
          selected={!selectedGenre}
          onPress={() => setSelectedGenre(null)}
          style={[styles.genreChip, !selectedGenre && styles.genreChipActive]}
        >
          {t('all')}
        </Chip>
        {genres.map((genre) => (
          <Chip
            key={genre}
            selected={selectedGenre === genre}
            onPress={() => setSelectedGenre(genre)}
            style={[styles.genreChip, selectedGenre === genre && styles.genreChipActive]}
          >
            {genre}
          </Chip>
        ))}
      </ScrollView>

      {/* New Releases Section */}
      {newReleases.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🆕 {t('newReleases')}</Text>
            <Text style={styles.sectionHint}>{t('newReleasesHint')}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {newReleases.map((novel) => (
              <TouchableOpacity key={novel.id} onPress={() => handleNovelPress(novel.id)}>
                <Surface style={styles.novelCard} elevation={2}>
                  {novel.cover_image_url ? (
                    <View style={styles.coverPlaceholder}>
                      <Text style={styles.coverEmoji}>📚</Text>
                    </View>
                  ) : (
                    <View style={[styles.coverPlaceholder, { backgroundColor: XColors.primary + '20' }]}>
                      <Text style={styles.coverEmoji}>📖</Text>
                    </View>
                  )}
                  <View style={styles.novelInfo}>
                    <Text style={styles.novelTitle} numberOfLines={2}>{novel.title}</Text>
                    <Text style={styles.novelAuthor} numberOfLines={1}>
                      {novel.author?.display_name || novel.author?.username}
                    </Text>
                    <View style={styles.novelMeta}>
                      <Chip mode="outlined" compact style={styles.genreTag}>{novel.genre}</Chip>
                    </View>
                  </View>
                </Surface>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Editor Picks Section */}
      {editorPicks.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⭐ {t('editorPicks')}</Text>
            <Text style={styles.sectionHint}>{t('editorPicksHint')}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {editorPicks.map((novel) => (
              <TouchableOpacity key={novel.id} onPress={() => handleNovelPress(novel.id)}>
                <Surface style={[styles.novelCard, styles.editorPickCard]} elevation={2}>
                  <View style={styles.editorBadge}>
                    <Text style={styles.editorBadgeText}>⭐</Text>
                  </View>
                  {novel.cover_image_url ? (
                    <View style={styles.coverPlaceholder}>
                      <Text style={styles.coverEmoji}>🌟</Text>
                    </View>
                  ) : (
                    <View style={[styles.coverPlaceholder, { backgroundColor: '#FFD70020' }]}>
                      <Text style={styles.coverEmoji}>✨</Text>
                    </View>
                  )}
                  <View style={styles.novelInfo}>
                    <Text style={styles.novelTitle} numberOfLines={2}>{novel.title}</Text>
                    <Text style={styles.novelAuthor} numberOfLines={1}>
                      {novel.author?.display_name || novel.author?.username}
                    </Text>
                    <View style={styles.novelMeta}>
                      <Chip mode="outlined" compact style={styles.genreTag}>{novel.genre}</Chip>
                    </View>
                  </View>
                </Surface>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Trending New Books Section */}
      {trendingNew.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔥 {t('trendingNew')}</Text>
            <Text style={styles.sectionHint}>{t('trendingNewHint')}</Text>
          </View>
          {trendingNew.map((novel, index) => (
            <TouchableOpacity key={novel.id} onPress={() => handleNovelPress(novel.id)}>
              <Surface style={styles.trendingItem} elevation={1}>
                <View style={styles.trendingRank}>
                  <Text style={styles.trendingRankText}>#{index + 1}</Text>
                </View>
                <View style={styles.trendingInfo}>
                  <Text style={styles.trendingTitle} numberOfLines={1}>{novel.title}</Text>
                  <Text style={styles.trendingAuthor} numberOfLines={1}>
                    {novel.author?.display_name || novel.author?.username}
                  </Text>
                </View>
                <Chip mode="outlined" compact style={styles.genreTag}>{novel.genre}</Chip>
              </Surface>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Empty State */}
      {newReleases.length === 0 && editorPicks.length === 0 && trendingNew.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyTitle}>{t('noNewBooks')}</Text>
          <Text style={styles.emptyText}>{t('noNewBooksHint')}</Text>
        </View>
      )}

      <View style={{ height: XSpacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: XColors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: XSpacing.lg,
    paddingBottom: XSpacing.md,
  },
  headerTitle: {
    ...XTypography.heading2,
    color: XColors.textPrimary,
    marginBottom: XSpacing.xs,
  },
  headerSubtitle: {
    ...XTypography.body,
    color: XColors.textSecondary,
  },
  genreScroll: {
    paddingHorizontal: XSpacing.lg,
    marginBottom: XSpacing.lg,
  },
  genreChip: {
    marginRight: XSpacing.sm,
    backgroundColor: XColors.surface,
  },
  genreChipActive: {
    backgroundColor: XColors.primary + '20',
    borderColor: XColors.primary,
  },
  section: {
    marginBottom: XSpacing.xl,
  },
  sectionHeader: {
    paddingHorizontal: XSpacing.lg,
    marginBottom: XSpacing.md,
  },
  sectionTitle: {
    ...XTypography.heading3,
    color: XColors.textPrimary,
    marginBottom: XSpacing.xs,
  },
  sectionHint: {
    ...XTypography.caption,
    color: XColors.textSecondary,
  },
  novelCard: {
    width: 180,
    marginLeft: XSpacing.lg,
    borderRadius: XBorderRadius.md,
    overflow: 'hidden',
    backgroundColor: XColors.surface,
  },
  editorPickCard: {
    borderColor: '#FFD70040',
    borderWidth: 2,
  },
  coverPlaceholder: {
    height: 120,
    backgroundColor: XColors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverEmoji: {
    fontSize: 48,
  },
  novelInfo: {
    padding: XSpacing.sm,
  },
  novelTitle: {
    ...XTypography.bodyStrong,
    color: XColors.textPrimary,
    marginBottom: XSpacing.xs,
  },
  novelAuthor: {
    ...XTypography.caption,
    color: XColors.textSecondary,
    marginBottom: XSpacing.sm,
  },
  novelMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: XSpacing.xs,
  },
  genreTag: {
    height: 24,
  },
  editorBadge: {
    position: 'absolute',
    top: XSpacing.sm,
    right: XSpacing.sm,
    backgroundColor: '#FFD700',
    borderRadius: XBorderRadius.full,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  editorBadgeText: {
    fontSize: 14,
  },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: XSpacing.md,
    marginHorizontal: XSpacing.lg,
    marginBottom: XSpacing.sm,
    borderRadius: XBorderRadius.md,
    backgroundColor: XColors.surface,
  },
  trendingRank: {
    width: 40,
    height: 40,
    borderRadius: XBorderRadius.full,
    backgroundColor: XColors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: XSpacing.md,
  },
  trendingRankText: {
    ...XTypography.bodyStrong,
    color: XColors.primary,
  },
  trendingInfo: {
    flex: 1,
  },
  trendingTitle: {
    ...XTypography.bodyStrong,
    color: XColors.textPrimary,
    marginBottom: XSpacing.xs,
  },
  trendingAuthor: {
    ...XTypography.caption,
    color: XColors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: XSpacing.xl * 2,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: XSpacing.md,
  },
  emptyTitle: {
    ...XTypography.heading3,
    color: XColors.textPrimary,
    marginBottom: XSpacing.sm,
  },
  emptyText: {
    ...XTypography.body,
    color: XColors.textSecondary,
    textAlign: 'center',
  },
});
