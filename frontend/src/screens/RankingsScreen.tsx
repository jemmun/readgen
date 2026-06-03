import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Text, ActivityIndicator, Chip, Surface } from 'react-native-paper';
import { novelsApi } from '../api/novels';
import { XColors, XTypography, XSpacing, XBorderRadius } from '../theme/xStyle';

interface RankedNovel {
  id: number;
  title: string;
  author: {
    id: number;
    username: string;
    display_name?: string;
  };
  genre?: string;
  total_word_count: number;
  cover_image_url?: string;
  review_count: number;
  avg_rating: number;
}

export default function RankingsScreen() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [genre, setGenre] = useState<string | undefined>(undefined);
  const [rankings, setRankings] = useState<RankedNovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRankings = async () => {
    try {
      const response = await novelsApi.getRankings({ period, genre });
      setRankings(response.data.novels);
    } catch (error) {
      console.error('Failed to load rankings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRankings();
  }, [period, genre]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRankings();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={XColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Period Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Time Period</Text>
        <View style={styles.chipRow}>
          <Chip
            selected={period === 'daily'}
            onPress={() => setPeriod('daily')}
            style={[styles.chip, period === 'daily' && styles.chipSelected]}
          >
            Daily
          </Chip>
          <Chip
            selected={period === 'weekly'}
            onPress={() => setPeriod('weekly')}
            style={[styles.chip, period === 'weekly' && styles.chipSelected]}
          >
            Weekly
          </Chip>
          <Chip
            selected={period === 'monthly'}
            onPress={() => setPeriod('monthly')}
            style={[styles.chip, period === 'monthly' && styles.chipSelected]}
          >
            Monthly
          </Chip>
        </View>
      </View>

      {/* Rankings List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {rankings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No rankings available for this period</Text>
          </View>
        ) : (
          rankings.map((novel, index) => (
            <Surface key={novel.id} style={styles.rankCard} elevation={1}>
              <View style={styles.rankHeader}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankNumber}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </Text>
                </View>
                <View style={styles.rankInfo}>
                  <Text style={styles.novelTitle} numberOfLines={1}>
                    {novel.title}
                  </Text>
                  <Text style={styles.authorName}>
                    by {novel.author?.display_name || novel.author?.username || 'Unknown'}
                  </Text>
                </View>
              </View>

              <View style={styles.rankStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{novel.avg_rating.toFixed(1)}</Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{novel.review_count}</Text>
                  <Text style={styles.statLabel}>Reviews</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{(novel.total_word_count / 1000).toFixed(1)}k</Text>
                  <Text style={styles.statLabel}>Words</Text>
                </View>
              </View>

              {novel.genre && (
                <Chip style={styles.genreChip} textStyle={styles.genreChipText}>
                  {novel.genre}
                </Chip>
              )}
            </Surface>
          ))
        )}
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
  filterSection: {
    padding: XSpacing.lg,
    backgroundColor: XColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
  },
  filterLabel: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
    marginBottom: XSpacing.sm,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    gap: XSpacing.sm,
  },
  chip: {
    backgroundColor: 'transparent',
    borderColor: XColors.border,
  },
  chipSelected: {
    backgroundColor: XColors.primary,
    borderColor: XColors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: XSpacing.lg,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    ...XTypography.bodyLarge,
    color: XColors.textSecondary,
  },
  rankCard: {
    padding: XSpacing.lg,
    borderRadius: XBorderRadius.md,
    backgroundColor: XColors.surface,
    marginBottom: XSpacing.md,
  },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: XSpacing.md,
  },
  rankBadge: {
    width: 48,
    height: 48,
    borderRadius: XBorderRadius.full,
    backgroundColor: XColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: XSpacing.md,
  },
  rankNumber: {
    fontSize: 24,
  },
  rankInfo: {
    flex: 1,
  },
  novelTitle: {
    fontSize: 17,
    color: XColors.textPrimary,
    fontWeight: '700',
    marginBottom: 4,
  },
  authorName: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },
  rankStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: XSpacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: XColors.border,
    marginBottom: XSpacing.sm,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: XColors.border,
  },
  statValue: {
    fontSize: 20,
    color: XColors.primary,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },
  genreChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(29, 155, 240, 0.12)',
  },
  genreChipText: {
    color: XColors.primary,
    fontWeight: '600',
  },
});
