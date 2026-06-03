import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { notificationsApi, NotificationItem } from '../api/notifications';
import { XColors, XTypography, XSpacing, XBorderRadius } from '../theme/xStyle';

type Props = StackScreenProps<RootStackParamList, 'Notifications'>;

const CATEGORIES = [
  { key: 'all', label: 'All', icon: '🔔' },
  { key: 'interaction', label: 'Interactions', icon: '❤️' },
  { key: 'collaboration', label: 'Collaboration', icon: '🤝' },
  { key: 'feedback', label: 'Feedback', icon: '⭐' },
  { key: 'system', label: 'System', icon: '⚙️' },
  { key: 'achievement', label: 'Achievements', icon: '🏆' },
];

const TYPE_ICONS: Record<string, string> = {
  like: '❤️', comment: '💬', follow: '👤', repost: '🔄', mention: '@',
  group_invite: '📨', group_post: '📝', group_novel: '📚',
  novel_review: '⭐', novel_rating: '⭐',
  system: '⚙️', achievement: '🏆',
};

export default function NotificationsScreen({ navigation }: Props) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [unreadByCategory, setUnreadByCategory] = useState<Record<string, number>>({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page: 1, page_size: 50 };
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      
      const [notifsRes, unreadRes, categoryCountsRes] = await Promise.all([
        notificationsApi.getAll(params),
        notificationsApi.getUnreadCount(),
        notificationsApi.getUnreadCountByCategory(),
      ]);
      
      setNotifications(notifsRes.data.notifications);
      setHasMore(notifsRes.data.has_more);
      setPage(1);
      setTotalUnread(unreadRes.data.unread_count);
      setUnreadByCategory(categoryCountsRes.data);
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadMore = async () => {
    if (!hasMore || loading) return;
    try {
      setLoading(true);
      const nextPage = page + 1;
      const params: any = { page: nextPage, page_size: 20 };
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      
      const res = await notificationsApi.getAll(params);
      setNotifications(prev => [...prev, ...res.data.notifications]);
      setHasMore(res.data.has_more);
      setPage(nextPage);
    } catch (e) {
      console.error('Failed to load more:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setTotalUnread(0);
      setUnreadByCategory({});
    } catch (e) {
      console.error('Failed to mark all read:', e);
    }
  };

  const handlePress = async (item: NotificationItem) => {
    if (!item.is_read) {
      try {
        await notificationsApi.markRead(item.id);
        setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));
        setTotalUnread(prev => Math.max(0, prev - 1));
      } catch (e) {}
    }
    if (item.post_id) {
      navigation.navigate('PostDetail', { postId: item.post_id });
    } else if (item.actor) {
      navigation.navigate('UserProfile', { userId: item.actor.id });
    }
  };

  const formatTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const getCategoryUnreadCount = (category: string) => {
    if (category === 'all') return totalUnread;
    return unreadByCategory[category] || 0;
  };

  if (loading && notifications.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search notifications..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={XColors.textSecondary}
        />
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {CATEGORIES.map((cat) => {
          const unread = getCategoryUnreadCount(cat.key);
          return (
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
              {unread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unread > 99 ? '99+' : unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Mark All Read */}
      {notifications.length > 0 && totalUnread > 0 && (
        <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      )}

      {/* Notifications List */}
      <FlatList
        data={notifications}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, !item.is_read && styles.itemUnread]}
            onPress={() => handlePress(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.typeIcon}>{TYPE_ICONS[item.type] || '🔔'}</Text>
            <View style={styles.itemContent}>
              <Text style={styles.itemText}>
                <Text style={styles.actorName}>{item.actor?.display_name || item.actor?.username || 'Someone'}</Text>
                {item.type === 'like' ? ' liked your post' :
                 item.type === 'comment' ? ' commented on your post' :
                 item.type === 'follow' ? ' started following you' :
                 item.type === 'repost' ? ' reposted your post' :
                 item.type === 'mention' ? ' mentioned you' :
                 item.type === 'novel_review' ? ' reviewed your novel' :
                 item.type === 'achievement' ? ' 🎉 Achievement unlocked!' :
                 ` ${item.type}`}
              </Text>
              {item.message && <Text style={styles.itemMessage}>{item.message}</Text>}
              <Text style={styles.itemTime}>{formatTime(item.created_at)}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loading && notifications.length > 0 ? <ActivityIndicator style={styles.footerLoader} /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: XColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  // Search
  searchContainer: {
    paddingHorizontal: XSpacing.lg,
    paddingVertical: XSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
  },
  searchInput: {
    backgroundColor: XColors.surface,
    borderRadius: XBorderRadius.full,
    paddingHorizontal: XSpacing.lg,
    paddingVertical: XSpacing.sm,
    fontSize: 15,
    color: XColors.textPrimary,
  },
  // Category Filter
  categoryScroll: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
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
  unreadBadge: {
    backgroundColor: XColors.primary,
    borderRadius: XBorderRadius.full,
    paddingHorizontal: XSpacing.xs,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: 'center',
  },
  unreadBadgeText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '700',
  },
  // Mark All Read
  markAllBtn: { paddingHorizontal: XSpacing.lg, paddingVertical: XSpacing.sm, alignItems: 'flex-end' },
  markAllText: { ...XTypography.bodySmall, color: XColors.primary, fontWeight: '600' },
  // Notification Item
  item: { flexDirection: 'row', padding: XSpacing.lg, borderBottomWidth: 1, borderBottomColor: XColors.border, alignItems: 'flex-start' },
  itemUnread: { backgroundColor: '#e8f5fd' },
  typeIcon: { fontSize: 20, marginRight: XSpacing.md, marginTop: 2 },
  itemContent: { flex: 1 },
  itemText: { ...XTypography.bodyMedium, color: XColors.textPrimary },
  actorName: { fontWeight: '700' },
  itemMessage: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    marginTop: XSpacing.xs,
    fontStyle: 'italic',
  },
  itemTime: { ...XTypography.bodySmall, color: XColors.textSecondary, marginTop: XSpacing.xs },
  emptyIcon: { fontSize: 48, marginBottom: XSpacing.md },
  emptyText: { ...XTypography.bodyMedium, color: XColors.textSecondary },
  footerLoader: { paddingVertical: XSpacing.lg },
});
