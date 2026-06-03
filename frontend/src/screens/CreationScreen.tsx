import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { novelsApi } from '../api/novels';
import { Novel } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { XColors, XTypography, XSpacing, XBorderRadius } from '../theme/xStyle';

type CreationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: CreationScreenNavigationProp;
}

export default function CreationScreen({ navigation }: Props) {
  const { t } = useI18n();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNovels = useCallback(async () => {
    try {
      const res = await novelsApi.list();
      setNovels(res.data);
    } catch (error) {
      console.error('Failed to load novels:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNovels();
  }, [loadNovels]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNovels();
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('myNovels')}</Text>
      </View>

      {novels.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>{t('noNovelsYet')}</Text>
          <Text style={styles.emptyHint}>{t('createFirstNovelHint')}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={XColors.primary} />
          }
        >
          {novels.map((novel) => (
            <TouchableOpacity
              key={novel.id}
              style={styles.novelCard}
              onPress={() => navigation.navigate('NovelDetail', { novelId: novel.id })}
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
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      {novel.total_word_count} {t('words')}
                    </Text>
                    <Text style={styles.metaDivider}>•</Text>
                    <Text style={styles.metaText}>
                      {novel.chapters?.length || 0} {t('chapters')}
                    </Text>
                  </View>
                  <View style={styles.badgeRow}>
                    {novel.genre && (
                      <View style={styles.genreBadge}>
                        <Text style={styles.genreBadgeText}>{novel.genre}</Text>
                      </View>
                    )}
                    <View style={[styles.statusBadge, novel.is_published ? styles.statusPublished : styles.statusDraft]}>
                      <Text style={[styles.statusBadgeText, novel.is_published ? styles.statusPublishedText : styles.statusDraftText]}>
                        {novel.is_published ? 'Published' : 'Unpublished'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateNovel')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
        <Text style={styles.fabLabel}>{t('createNovel')}</Text>
      </TouchableOpacity>
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
    padding: XSpacing.xxl,
  },
  header: {
    paddingHorizontal: XSpacing.lg,
    paddingTop: XSpacing.lg,
    paddingBottom: XSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
  },
  headerTitle: {
    ...XTypography.headlineMedium,
    color: XColors.textPrimary,
  },
  emptyTitle: {
    ...XTypography.headlineMedium,
    color: XColors.textPrimary,
    marginBottom: XSpacing.sm,
  },
  emptyHint: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
    textAlign: 'center',
  },
  list: {
    paddingBottom: 100,
  },
  novelCard: {
    backgroundColor: XColors.background,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
    padding: XSpacing.lg,
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
    marginBottom: XSpacing.xs,
  },
  novelDesc: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    marginBottom: XSpacing.sm,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: XSpacing.sm,
  },
  metaText: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },
  metaDivider: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    marginHorizontal: XSpacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  genreBadge: {
    backgroundColor: 'rgba(29, 155, 240, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: XBorderRadius.full,
    alignSelf: 'flex-start',
  },
  genreBadgeText: {
    fontSize: 12,
    color: XColors.primary,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: XBorderRadius.full,
    alignSelf: 'flex-start',
  },
  statusPublished: {
    backgroundColor: 'rgba(0, 186, 124, 0.12)',
  },
  statusDraft: {
    backgroundColor: 'rgba(83, 100, 113, 0.12)',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusPublishedText: {
    color: '#00ba7c',
  },
  statusDraftText: {
    color: '#536471',
  },
  fab: {
    position: 'absolute',
    right: XSpacing.lg,
    bottom: XSpacing.lg,
    backgroundColor: XColors.primary,
    paddingHorizontal: XSpacing.lg,
    paddingVertical: XSpacing.md,
    borderRadius: XBorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  fabIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginRight: XSpacing.xs,
  },
  fabLabel: {
    ...XTypography.bodySmall,
    color: '#ffffff',
    fontWeight: '600',
  },
});
