import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Text, ActivityIndicator, Chip, Surface } from 'react-native-paper';
import { groupsApi } from '../api/groups';
import { XColors, XTypography, XSpacing, XBorderRadius } from '../theme/xStyle';

interface GroupMetrics {
  messages: number;
  posts: number;
  novels: number;
  total_words: number;
}

interface RankedGroup {
  id: number;
  name: string;
  description?: string;
  owner?: {
    id: number;
    username: string;
    display_name?: string;
  };
  member_count: number;
  activity_score: number;
  metrics: GroupMetrics;
  created_at: string;
}

export default function GroupLeaderboardScreen() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('weekly');
  const [leaderboard, setLeaderboard] = useState<RankedGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLeaderboard = async () => {
    try {
      const response = await groupsApi.getLeaderboard({ period });
      setLeaderboard(response.data.groups);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, [period]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLeaderboard();
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
          <Chip
            selected={period === 'all'}
            onPress={() => setPeriod('all')}
            style={[styles.chip, period === 'all' && styles.chipSelected]}
          >
            All Time
          </Chip>
        </View>
      </View>

      {/* Leaderboard List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {leaderboard.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No groups available for this period</Text>
          </View>
        ) : (
          leaderboard.map((group, index) => (
            <Surface key={group.id} style={styles.groupCard} elevation={1}>
              <View style={styles.groupHeader}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankNumber}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </Text>
                </View>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName} numberOfLines={1}>
                    {group.name}
                  </Text>
                  <Text style={styles.ownerName}>
                    by {group.owner?.display_name || group.owner?.username || 'Unknown'}
                  </Text>
                </View>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreValue}>{group.activity_score.toFixed(0)}</Text>
                  <Text style={styles.scoreLabel}>points</Text>
                </View>
              </View>

              {group.description && (
                <Text style={styles.groupDescription} numberOfLines={2}>
                  {group.description}
                </Text>
              )}

              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{group.member_count}</Text>
                  <Text style={styles.metricLabel}>Members</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{group.metrics.messages}</Text>
                  <Text style={styles.metricLabel}>Messages</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{group.metrics.posts}</Text>
                  <Text style={styles.metricLabel}>Posts</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{group.metrics.novels}</Text>
                  <Text style={styles.metricLabel}>Novels</Text>
                </View>
              </View>

              <View style={styles.wordsBar}>
                <View style={styles.wordsBarBg}>
                  <View 
                    style={[
                      styles.wordsBarFill, 
                      { width: `${Math.min(100, (group.metrics.total_words / 100000) * 100)}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.wordsText}>
                  {(group.metrics.total_words / 1000).toFixed(1)}k words
                </Text>
              </View>
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
    flexWrap: 'wrap',
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
  groupCard: {
    padding: XSpacing.lg,
    borderRadius: XBorderRadius.md,
    backgroundColor: XColors.surface,
    marginBottom: XSpacing.md,
  },
  groupHeader: {
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
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 17,
    color: XColors.textPrimary,
    fontWeight: '700',
    marginBottom: 4,
  },
  ownerName: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },
  scoreBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(29, 155, 240, 0.12)',
    padding: XSpacing.sm,
    borderRadius: XBorderRadius.md,
    minWidth: 70,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
    color: XColors.primary,
  },
  scoreLabel: {
    fontSize: 11,
    color: XColors.textSecondary,
  },
  groupDescription: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
    marginBottom: XSpacing.md,
    lineHeight: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: XSpacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: XColors.border,
    marginBottom: XSpacing.md,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: XColors.primary,
    marginBottom: 4,
  },
  metricLabel: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },
  wordsBar: {
    marginTop: XSpacing.xs,
  },
  wordsBarBg: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  wordsBarFill: {
    height: '100%',
    backgroundColor: XColors.primary,
    borderRadius: 4,
  },
  wordsText: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
});
