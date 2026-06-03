import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { Text, ActivityIndicator, Icon } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { novelsApi } from '../api/novels';
import { recommendationsApi } from '../api/recommendations';
import { Novel } from '../types';
import { XColors, XTypography, XSpacing, XBorderRadius } from '../theme/xStyle';
import { useI18n } from '../i18n/I18nContext';

type LibraryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: LibraryScreenNavigationProp;
}

export default function LibraryScreen({ navigation }: Props) {
  const { t, language } = useI18n();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [recommended, setRecommended] = useState<Novel[]>([]);
  const [personalizedRecs, setPersonalizedRecs] = useState<Novel[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const [selectedAudience, setSelectedAudience] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [novelsRes, recRes, genresRes, personalRecsRes] = await Promise.all([
        novelsApi.all(),
        novelsApi.recommended(),
        novelsApi.genres(),
        recommendationsApi.getRecommendations(10).catch(() => ({ data: [] })),
      ]);
      // novelsApi.all() returns PaginatedResponse, extract items array
      setNovels(Array.isArray(novelsRes.data) ? novelsRes.data : novelsRes.data?.items || []);
      setRecommended(recRes.data);
      setGenres(genresRes.data.genres || []);
      setPersonalizedRecs(personalRecsRes.data || []);
    } catch (error) {
      console.error('Failed to load library:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleGenreSelect = async (genre: string | null) => {
    setSelectedGenre(genre);
    setLoading(true);
    try {
      const res = await novelsApi.all({ genre: genre || undefined });
      // Extract items from paginated response
      setNovels(Array.isArray(res.data) ? res.data : res.data?.items || []);
    } catch (error) {
      console.error('Failed to filter by genre:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    setLoading(true);
    try {
      const res = await novelsApi.all({
        genre: selectedGenre || undefined,
        style: selectedStyle || undefined,
        tone: selectedTone || undefined,
        target_audience: selectedAudience || undefined,
        is_completed: isCompleted || undefined,
      });
      // Extract items from paginated response
      setNovels(Array.isArray(res.data) ? res.data : res.data?.items || []);
      setShowFilters(false);
    } catch (error) {
      console.error('Failed to apply filters:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = async () => {
    setSelectedGenre(null);
    setSelectedStyle(null);
    setSelectedTone(null);
    setSelectedAudience(null);
    setIsCompleted(null);
    setLoading(true);
    try {
      const res = await novelsApi.all();
      // Extract items from paginated response
      setNovels(Array.isArray(res.data) ? res.data : res.data?.items || []);
    } catch (error) {
      console.error('Failed to clear filters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      handleGenreSelect(selectedGenre);
      return;
    }
    setSearching(true);
    try {
      const res = await novelsApi.search(searchQuery.trim());
      setNovels(res.data);
      setSelectedGenre(null);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleOpenBook = (novelId: number) => {
    navigation.navigate('LibraryBookDetail', { novelId });
  };

  if (loading && !refreshing && novels.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={XColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={XColors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('libraryHeader')}</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Icon source="magnify" color={XColors.textSecondary} size={20} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('librarySearch')}
              placeholderTextColor={XColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); handleGenreSelect(selectedGenre); }}>
                <Icon source="close-circle" color={XColors.textSecondary} size={18} />
              </TouchableOpacity>
            )}
          </View>
          {searching && <ActivityIndicator size="small" color={XColors.primary} style={styles.searchSpinner} />}
        </View>

        {/* Genre Pills */}
        {genres.length > 0 && (
          <View style={styles.genreSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genrePills}>
              <TouchableOpacity
                style={[styles.genrePill, selectedGenre === null && styles.genrePillActive]}
                onPress={() => handleGenreSelect(null)}
              >
                <Text style={[styles.genrePillText, selectedGenre === null && styles.genrePillTextActive]}>
                  {t('genreAll')}
                </Text>
              </TouchableOpacity>
              {genres.map((genre) => (
                <TouchableOpacity
                  key={genre}
                  style={[styles.genrePill, selectedGenre === genre && styles.genrePillActive]}
                  onPress={() => handleGenreSelect(genre)}
                >
                  <Text style={[styles.genrePillText, selectedGenre === genre && styles.genrePillTextActive]}>
                    {genre}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Personalized Recommendations */}
        {personalizedRecs.length > 0 && !searchQuery && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('recommendedForYou')}</Text>
              <Text style={styles.sectionSubtitle}>{t('basedOnHistory')}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendedList}>
              {personalizedRecs.map((novel) => (
                <TouchableOpacity
                  key={`personal-${novel.id}`}
                  style={styles.recommendedCard}
                  onPress={() => handleOpenBook(novel.id)}
                >
                  {novel.cover_image_url ? (
                    <Image
                      source={{ uri: `http://localhost:8000${novel.cover_image_url}` }}
                      style={styles.recommendedCover}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.recommendedCover, { backgroundColor: '#e8e8e8' }]}>
                      <Icon source="book-open-page-variant" color={XColors.primary} size={40} />
                    </View>
                  )}
                  <Text style={styles.recommendedTitle} numberOfLines={2}>
                    {novel.title}
                  </Text>
                  {novel.genre && (
                    <Text style={styles.recommendedGenre} numberOfLines={1}>
                      {novel.genre}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recommended Section */}
        {recommended.length > 0 && !searchQuery && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('recommended')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendedList}>
              {recommended.map((novel) => (
                <TouchableOpacity
                  key={novel.id}
                  style={styles.recommendedCard}
                  onPress={() => handleOpenBook(novel.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.recommendedCover}>
                    <Text style={styles.recommendedCoverText}>{novel.title.charAt(0)}</Text>
                  </View>
                  <Text style={styles.recommendedTitle} numberOfLines={2}>{novel.title}</Text>
                  {novel.genre && (
                    <Text style={styles.recommendedMeta}>{novel.genre}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Novel List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {searchQuery ? t('searchResults') : (selectedGenre || t('allNovels'))}
          </Text>
          {novels.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('noNovels')}</Text>
            </View>
          ) : (
            novels.map((novel) => (
              <TouchableOpacity
                key={novel.id}
                style={styles.novelCard}
                onPress={() => handleOpenBook(novel.id)}
                activeOpacity={0.7}
              >
                <View style={styles.novelRow}>
                  {novel.cover_image_url ? (
                    <Image source={{ uri: `http://localhost:8000${novel.cover_image_url}` }} style={styles.novelCover} resizeMode="cover" />
                  ) : (
                    <View style={styles.novelCover}>
                      <Text style={styles.novelCoverText}>{novel.title.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={styles.novelInfo}>
                    <Text style={styles.novelTitle} numberOfLines={1}>{novel.title}</Text>
                    {novel.theme_description && (
                      <Text style={styles.novelDesc} numberOfLines={2}>{novel.theme_description}</Text>
                    )}
                    <View style={styles.novelMetaRow}>
                      {novel.genre && (
                        <View style={styles.genreBadge}>
                          <Text style={styles.genreBadgeText}>{novel.genre}</Text>
                        </View>
                      )}
                      <Text style={styles.novelMetaText}>
                        {t('wordsCount').replace('{{count}}', String(novel.total_word_count))}
                      </Text>
                      <Text style={styles.metaDot}>•</Text>
                      <Text style={styles.novelMetaText}>
                        {t('chaptersCount').replace('{{count}}', String(novel.chapters?.length || 0))}
                      </Text>
                    </View>
                    {novel.author && (
                      <Text style={styles.authorText}>
                        {t('byAuthor').replace('{{author}}', novel.author.display_name || novel.author.username)}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
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
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: XSpacing.lg,
    paddingTop: XSpacing.lg,
    paddingBottom: XSpacing.sm,
  },
  headerTitle: {
    ...XTypography.headlineMedium,
    color: XColors.textPrimary,
  },

  // Search
  searchContainer: {
    paddingHorizontal: XSpacing.lg,
    paddingTop: XSpacing.sm,
    paddingBottom: XSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: XColors.surface,
    borderRadius: XBorderRadius.full,
    paddingHorizontal: XSpacing.md,
    paddingVertical: XSpacing.sm,
    borderWidth: 1,
    borderColor: XColors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: XSpacing.sm,
    fontSize: 15,
    color: XColors.textPrimary,
    paddingVertical: 0,
  },
  searchSpinner: {
    marginLeft: XSpacing.sm,
  },

  // Genre Pills
  genreSection: {
    paddingVertical: XSpacing.sm,
  },
  genrePills: {
    paddingHorizontal: XSpacing.lg,
    gap: XSpacing.sm,
  },
  genrePill: {
    paddingHorizontal: XSpacing.md,
    paddingVertical: 6,
    borderRadius: XBorderRadius.full,
    backgroundColor: XColors.surface,
    borderWidth: 1,
    borderColor: XColors.border,
  },
  genrePillActive: {
    backgroundColor: XColors.primary,
    borderColor: XColors.primary,
  },
  genrePillText: {
    fontSize: 14,
    color: XColors.textSecondary,
    fontWeight: '500',
  },
  genrePillTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },

  // Sections
  section: {
    marginTop: XSpacing.lg,
    paddingHorizontal: XSpacing.lg,
  },
  sectionHeader: {
    marginBottom: XSpacing.md,
  },
  sectionTitle: {
    ...XTypography.titleLarge,
    color: XColors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },

  // Recommended
  recommendedList: {
    gap: XSpacing.md,
    paddingRight: XSpacing.lg,
  },
  recommendedCard: {
    width: 140,
    backgroundColor: XColors.surface,
    borderRadius: XBorderRadius.md,
    padding: XSpacing.md,
    borderWidth: 1,
    borderColor: XColors.border,
  },
  recommendedCover: {
    width: '100%',
    height: 100,
    backgroundColor: XColors.primary,
    borderRadius: XBorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: XSpacing.sm,
  },
  recommendedTitle: {
    ...XTypography.bodyMedium,
    color: XColors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  recommendedGenre: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },
  recommendedCoverText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  recommendedMeta: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },

  // Novel List
  novelCard: {
    backgroundColor: XColors.background,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
    paddingVertical: XSpacing.md,
  },
  novelRow: {
    flexDirection: 'row',
  },
  novelCover: {
    width: 64,
    height: 90,
    backgroundColor: XColors.primary,
    borderRadius: XBorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: XSpacing.md,
  },
  novelCoverText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  novelInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  novelTitle: {
    ...XTypography.titleLarge,
    color: XColors.textPrimary,
    marginBottom: 2,
  },
  novelDesc: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    marginBottom: XSpacing.sm,
    lineHeight: 18,
  },
  novelMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  genreBadge: {
    backgroundColor: 'rgba(29, 155, 240, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: XBorderRadius.full,
    marginRight: XSpacing.sm,
  },
  genreBadgeText: {
    fontSize: 12,
    color: XColors.primary,
    fontWeight: '600',
  },
  novelMetaText: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },
  metaDot: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    marginHorizontal: 4,
  },
  authorText: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },

  // Empty
  emptyContainer: {
    paddingVertical: XSpacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
  },
});
