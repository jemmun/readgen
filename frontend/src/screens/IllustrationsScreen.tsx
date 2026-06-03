import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Image } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useI18n } from '../i18n/I18nContext';
import { XColors, XTypography, XSpacing, XBorderRadius } from '../theme/xStyle';
import { illustrationsApi, Illustration } from '../api/illustrations';

type IllustrationsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: IllustrationsScreenNavigationProp;
}

export default function IllustrationsScreen({ navigation }: Props) {
  const { t } = useI18n();
  const [illustrations, setIllustrations] = useState<Illustration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const loadIllustrations = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = filterType !== 'all' ? { illustration_type: filterType } : undefined;
      const res = await illustrationsApi.getAll(params);
      setIllustrations(res.data);
    } catch (err: any) {
      console.error('[IllustrationsScreen] load failed:', err);
      setError(err.response?.data?.detail || 'Failed to load illustrations');
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    loadIllustrations();
  }, [loadIllustrations]);

  // Refresh when screen gains focus (e.g. after creating an illustration)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadIllustrations);
    return unsubscribe;
  }, [navigation, loadIllustrations]);

  const renderIllustration = ({ item }: { item: Illustration }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('IllustrationDetail', { illustrationId: item.id })}
      activeOpacity={0.7}
    >
      {item.image_url ? (
        <Image
          source={{ uri: `http://localhost:8000${item.image_url}` }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.cardPlaceholder}>
          <Text style={styles.cardPlaceholderIcon}>🎨</Text>
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardPrompt} numberOfLines={2}>{item.prompt}</Text>
        <Text style={styles.cardMeta}>{item.style} · {item.size}</Text>
        <View style={styles.cardTagRow}>
          <Text style={[styles.cardStatus, item.status === 'completed' && styles.cardStatusComplete]}>
            {item.status}
          </Text>
          {item.illustration_type === 'cover' && (
            <View style={styles.coverBadge}>
              <Text style={styles.coverBadgeText}>{t('cover')}</Text>
            </View>
          )}
        </View>
        {item.tags ? (
          <View style={styles.cardTagChips}>
            {item.tags.split(',').slice(0, 3).map((tag, idx) => (
              tag.trim() ? <Text key={idx} style={styles.cardTagChip}>{tag.trim()}</Text> : null
            ))}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('illustrations')}</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={XColors.primary} />
        </View>
      </View>
    );
  }

  if (illustrations.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('illustrations')}</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🎨</Text>
          <Text style={styles.emptyTitle}>{t('noIllustrationsYet')}</Text>
          <Text style={styles.emptyHint}>
            {t('createFirstIllustrationHint')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('IllustrationCreate')}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>+</Text>
          <Text style={styles.fabLabel}>{t('createIllustration')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('illustrations')}</Text>
      </View>
      {/* Filter chips */}
      <View style={styles.filterRow}>
        {[{key: 'all', label: 'All'}, {key: 'cover', label: t('cover')}, {key: 'illustration', label: t('illustration')}].map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filterType === f.key && styles.filterChipActive]}
            onPress={() => setFilterType(f.key)}
          >
            <Text style={[styles.filterChipText, filterType === f.key && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={illustrations}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderIllustration}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadIllustrations}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('IllustrationCreate')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
        <Text style={styles.fabLabel}>{t('createIllustration')}</Text>
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
  emptyIcon: {
    fontSize: 64,
    marginBottom: XSpacing.lg,
  },
  emptyTitle: {
    ...XTypography.headlineMedium,
    color: XColors.textPrimary,
    marginBottom: XSpacing.sm,
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
  emptyHint: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
    textAlign: 'center',
  },
  list: {
    padding: XSpacing.md,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: XColors.surface,
    borderRadius: XBorderRadius.md,
    marginBottom: XSpacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: XColors.border,
  },
  cardImage: {
    width: 100,
    height: 100,
  },
  cardPlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: XColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardPlaceholderIcon: {
    fontSize: 32,
  },
  cardInfo: {
    flex: 1,
    padding: XSpacing.md,
    justifyContent: 'center',
  },
  cardPrompt: {
    ...XTypography.bodyMedium,
    color: XColors.textPrimary,
    fontWeight: '600',
    marginBottom: XSpacing.xs,
  },
  cardMeta: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    marginBottom: XSpacing.xs,
  },
  cardStatus: {
    ...XTypography.bodySmall,
    color: '#ff9800',
    textTransform: 'capitalize' as const,
  },
  cardStatusComplete: {
    color: '#4caf50',
  },
  cardTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: XSpacing.xs,
  },
  coverBadge: {
    backgroundColor: '#ff9800',
    paddingHorizontal: XSpacing.sm,
    paddingVertical: 1,
    borderRadius: XBorderRadius.sm,
    marginLeft: XSpacing.sm,
  },
  coverBadgeText: {
    ...XTypography.bodySmall,
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 10,
  },
  cardTagChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: XSpacing.xs,
  },
  cardTagChip: {
    ...XTypography.bodySmall,
    color: XColors.primary,
    backgroundColor: XColors.primary + '15',
    paddingHorizontal: XSpacing.sm,
    paddingVertical: 2,
    borderRadius: XBorderRadius.full,
    marginRight: XSpacing.xs,
    fontSize: 11,
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: XSpacing.md,
    paddingVertical: XSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
  },
  filterChip: {
    paddingHorizontal: XSpacing.md,
    paddingVertical: XSpacing.xs,
    borderRadius: XBorderRadius.full,
    borderWidth: 1,
    borderColor: XColors.border,
    marginRight: XSpacing.sm,
  },
  filterChipActive: {
    backgroundColor: XColors.primary,
    borderColor: XColors.primary,
  },
  filterChipText: {
    ...XTypography.bodySmall,
    color: XColors.textPrimary,
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
