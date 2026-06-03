import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { XColors, XTypography, XSpacing, XBorderRadius } from '../theme/xStyle';
import { achievementsApi } from '../api/achievements';
import { Ionicons } from '@expo/vector-icons';

type Achievement = {
  id: number;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  created_at: string;
  user_achievement_id?: number | null;
  progress: number;
  is_unlocked: boolean;
  unlocked_at?: string | null;
};

const CATEGORIES = [
  { key: 'all', label: 'All', icon: '🏆' },
  { key: 'writing', label: 'Writing', icon: '✍️' },
  { key: 'reading', label: 'Reading', icon: '📚' },
  { key: 'social', label: 'Social', icon: '👥' },
  { key: 'collaboration', label: 'Collaboration', icon: '🤝' },
];

export default function AchievementsScreen() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    loadAchievements();
  }, [selectedCategory]);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      const response = await achievementsApi.getMyAchievements(params);
      setAchievements(response.data);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAchievements();
    setRefreshing(false);
  };

  const handleCheckAchievements = async () => {
    try {
      setChecking(true);
      const response = await achievementsApi.checkAchievements();
      if (response.data.count > 0) {
        // Reload to show new progress/unlocks
        await loadAchievements();
      }
    } catch (error) {
      console.error('Failed to check achievements:', error);
    } finally {
      setChecking(false);
    }
  };

  const renderAchievement = ({ item }: { item: Achievement }) => {
    const progressPercent = Math.min(
      100,
      Math.round((item.progress / item.requirement_value) * 100)
    );

    return (
      <View style={[styles.achievementCard, item.is_unlocked && styles.unlockedCard]}>
        <View style={styles.achievementHeader}>
          <Text style={styles.achievementIcon}>{item.icon}</Text>
          <View style={styles.achievementInfo}>
            <Text style={[styles.achievementName, item.is_unlocked && styles.unlockedName]}>
              {item.name}
            </Text>
            <Text style={styles.achievementDescription}>{item.description}</Text>
          </View>
          {item.is_unlocked && (
            <Ionicons name="checkmark-circle" size={24} color={XColors.success} />
          )}
        </View>

        {!item.is_unlocked && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>
                {item.progress} / {item.requirement_value}
              </Text>
              <Text style={styles.progressPercent}>{progressPercent}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>
          </View>
        )}

        {item.is_unlocked && item.unlocked_at && (
          <Text style={styles.unlockedDate}>
            Unlocked {new Date(item.unlocked_at).toLocaleDateString()}
          </Text>
        )}
      </View>
    );
  };

  const unlockedCount = achievements.filter((a) => a.is_unlocked).length;
  const totalCount = achievements.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Achievements</Text>
        <TouchableOpacity
          style={styles.checkButton}
          onPress={handleCheckAchievements}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator size="small" color={XColors.primary} />
          ) : (
            <Ionicons name="refresh" size={20} color={XColors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {totalCount > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{unlockedCount}</Text>
            <Text style={styles.statLabel}>Unlocked</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalCount}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0}%
            </Text>
            <Text style={styles.statLabel}>Complete</Text>
          </View>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoryChip,
              selectedCategory === cat.key && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text
              style={[
                styles.categoryLabel,
                selectedCategory === cat.key && styles.categoryLabelActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={XColors.primary} />
        </View>
      ) : (
        <FlatList
          data={achievements}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderAchievement}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🏆</Text>
              <Text style={styles.emptyText}>No achievements found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: XColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: XSpacing.lg,
    paddingVertical: XSpacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: XColors.textPrimary,
  },
  checkButton: {
    padding: XSpacing.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: XColors.surface,
    marginHorizontal: XSpacing.lg,
    marginBottom: XSpacing.md,
    padding: XSpacing.md,
    borderRadius: XBorderRadius.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: XColors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: XColors.textSecondary,
    marginTop: XSpacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: XColors.border,
  },
  categoryScroll: {
    maxHeight: 50,
  },
  categoryContainer: {
    paddingHorizontal: XSpacing.lg,
    paddingVertical: XSpacing.sm,
    gap: XSpacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: XSpacing.md,
    paddingVertical: XSpacing.sm,
    borderRadius: XBorderRadius.full,
    backgroundColor: XColors.surface,
    borderWidth: 1,
    borderColor: XColors.border,
    gap: XSpacing.xs,
  },
  categoryChipActive: {
    backgroundColor: `${XColors.primary}20`,
    borderColor: XColors.primary,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 14,
    color: XColors.textSecondary,
  },
  categoryLabelActive: {
    color: XColors.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: XSpacing.lg,
    gap: XSpacing.md,
  },
  achievementCard: {
    backgroundColor: XColors.surface,
    padding: XSpacing.md,
    borderRadius: XBorderRadius.lg,
    borderWidth: 1,
    borderColor: XColors.border,
  },
  unlockedCard: {
    borderColor: XColors.success,
    backgroundColor: `${XColors.success}10`,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: XSpacing.sm,
  },
  achievementIcon: {
    fontSize: 32,
    marginRight: XSpacing.md,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 17,
    fontWeight: '600',
    color: XColors.textPrimary,
    marginBottom: XSpacing.xs,
  },
  unlockedName: {
    color: XColors.success,
  },
  achievementDescription: {
    fontSize: 14,
    color: XColors.textSecondary,
    lineHeight: 20,
  },
  progressSection: {
    marginTop: XSpacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: XSpacing.xs,
  },
  progressText: {
    fontSize: 13,
    color: XColors.textSecondary,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '600',
    color: XColors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: XColors.background,
    borderRadius: XBorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: XColors.primary,
    borderRadius: XBorderRadius.full,
  },
  unlockedDate: {
    fontSize: 12,
    color: XColors.success,
    marginTop: XSpacing.xs,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: XSpacing.xl * 2,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: XSpacing.md,
  },
  emptyText: {
    fontSize: 16,
    color: XColors.textSecondary,
  },
});
