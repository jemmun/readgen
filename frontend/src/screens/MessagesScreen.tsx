import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { messagesApi, Conversation } from '../api/messages';
import { notificationsApi, NotificationItem } from '../api/notifications';
import { XColors, XTypography, XSpacing, XBorderRadius } from '../theme/xStyle';
import { useI18n } from '../i18n/I18nContext';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Home'>;
};

type TabType = 'all' | 'dm' | 'notification' | 'like' | 'comment' | 'mention';

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '📬' },
  { key: 'dm', label: 'DMs', icon: '💬' },
  { key: 'notification', label: 'System', icon: '🔔' },
  { key: 'like', label: 'Likes', icon: '❤️' },
  { key: 'comment', label: 'Comments', icon: '💭' },
  { key: 'mention', label: 'Mentions', icon: '@' },
];

const TYPE_ICONS: Record<string, string> = {
  like: '❤️', comment: '💬', follow: '👤', repost: '🔄', mention: '@', system: '🔔',
};

export default function MessagesScreen({ navigation }: Props) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic tabs based on current language
  const TABS: { key: TabType; label: string; icon: string }[] = [
    { key: 'all', label: t('messagesAll'), icon: '📬' },
    { key: 'dm', label: t('messagesDms'), icon: '💬' },
    { key: 'notification', label: t('messagesSystem'), icon: '🔔' },
    { key: 'like', label: t('messagesLikes'), icon: '❤️' },
    { key: 'comment', label: t('messagesComments'), icon: '💭' },
    { key: 'mention', label: t('messagesMentions'), icon: '@' },
  ];

  const loadData = useCallback(async () => {
    try {
      const [convRes, notifRes] = await Promise.all([
        messagesApi.getConversations(),
        notificationsApi.getAll({ page: 1, page_size: 50 }),
      ]);
      setConversations(convRes.data);
      setNotifications(notifRes.data.notifications);
    } catch (e) {
      console.error('Failed to load messages:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error('Failed to mark all read:', e);
    }
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    if (!item.is_read) {
      try {
        await notificationsApi.markRead(item.id);
        setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));
      } catch (e) {}
    }
    if (item.post_id) {
      navigation.navigate('PostDetail' as any, { postId: item.post_id });
    } else if (item.actor) {
      navigation.navigate('UserProfile' as any, { userId: item.actor.id });
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

  // Filter notifications by tab
  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all' || activeTab === 'dm') return true;
    if (activeTab === 'notification') return !['like', 'comment', 'mention'].includes(n.type);
    return n.type === activeTab;
  });

  // Combined items for "All" tab
  const allItems = activeTab === 'all' 
    ? [
        ...conversations.map(c => ({ type: 'dm' as const, data: c })),
        ...notifications.map(n => ({ type: 'notification' as const, data: n })),
      ]
    : [];

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Mark all read button for notifications */}
      {activeTab !== 'dm' && notifications.some(n => !n.is_read) && (
        <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
          <Text style={styles.markAllText}>{t('markAllRead')}</Text>
        </TouchableOpacity>
      )}

      {/* Content */}
      {activeTab === 'dm' ? (
        // DMs tab - show conversations
        conversations.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>{t('noConversations')}</Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => String(item.partner_id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.convItem}
                onPress={() => navigation.navigate('Chat' as any, { userId: item.partner_id, userName: item.partner?.display_name || item.partner?.username || 'User' })}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(item.partner?.display_name || item.partner?.username || 'U')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.convInfo}>
                  <Text style={styles.convName}>{item.partner?.display_name || item.partner?.username || 'User'}</Text>
                  <Text style={styles.convPreview} numberOfLines={1}>{item.last_message}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )
      ) : activeTab === 'all' ? (
        // All tab - combined view
        allItems.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No messages or notifications</Text>
          </View>
        ) : (
          <FlatList
            data={allItems}
            keyExtractor={(item, index) => `${item.type}-${index}`}
            renderItem={({ item }) => {
              if (item.type === 'dm') {
                const conv = item.data as Conversation;
                return (
                  <TouchableOpacity
                    style={styles.convItem}
                    onPress={() => navigation.navigate('Chat' as any, { userId: conv.partner_id, userName: conv.partner?.display_name || conv.partner?.username || 'User' })}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(conv.partner?.display_name || conv.partner?.username || 'U')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.convInfo}>
                      <Text style={styles.convName}>{conv.partner?.display_name || conv.partner?.username || 'User'}</Text>
                      <Text style={styles.convPreview} numberOfLines={1}>{conv.last_message}</Text>
                    </View>
                  </TouchableOpacity>
                );
              } else {
                const notif = item.data as NotificationItem;
                return (
                  <TouchableOpacity
                    style={[styles.notifItem, !notif.is_read && styles.notifItemUnread]}
                    onPress={() => handleNotificationPress(notif)}
                  >
                    <View style={styles.notifIcon}>
                      <Text style={styles.notifIconText}>{TYPE_ICONS[notif.type] || '🔔'}</Text>
                    </View>
                    <View style={styles.notifContent}>
                      <Text style={styles.notifAuthor}>
                        {notif.actor?.display_name || notif.actor?.username || 'System'}
                      </Text>
                      <Text style={styles.notifMessage} numberOfLines={2}>
                        {notif.message || `${notif.type} notification`}
                      </Text>
                      <Text style={styles.notifTime}>{formatTime(notif.created_at)}</Text>
                    </View>
                    {!notif.is_read && <View style={styles.notifDot} />}
                  </TouchableOpacity>
                );
              }
            }}
          />
        )
      ) : (
        // Filtered notifications tab
        filteredNotifications.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {t('noNotifications').replace('{{tab}}', activeTab)}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredNotifications}
            keyExtractor={item => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.notifItem, !item.is_read && styles.notifItemUnread]}
                onPress={() => handleNotificationPress(item)}
              >
                <View style={styles.notifIcon}>
                  <Text style={styles.notifIconText}>{TYPE_ICONS[item.type] || '🔔'}</Text>
                </View>
                <View style={styles.notifContent}>
                  <Text style={styles.notifAuthor}>
                    {item.actor?.display_name || item.actor?.username || 'System'}
                  </Text>
                  <Text style={styles.notifMessage} numberOfLines={2}>
                    {item.message || `${item.type} notification`}
                  </Text>
                  <Text style={styles.notifTime}>{formatTime(item.created_at)}</Text>
                </View>
                {!item.is_read && <View style={styles.notifDot} />}
              </TouchableOpacity>
            )}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: XColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { ...XTypography.bodyLarge, color: XColors.textSecondary },
  // Tabs
  tabBar: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: XSpacing.md,
    paddingVertical: XSpacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: XColors.primary,
  },
  tabIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  tabLabel: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: XColors.primary,
    fontWeight: '700',
  },
  // Mark all read
  markAllBtn: {
    padding: XSpacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
  },
  markAllText: {
    ...XTypography.bodySmall,
    color: XColors.primary,
    fontWeight: '600',
  },
  // Conversations
  convItem: {
    flexDirection: 'row', alignItems: 'center', padding: XSpacing.lg,
    borderBottomWidth: 1, borderBottomColor: XColors.border,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: XColors.primary,
    justifyContent: 'center', alignItems: 'center', marginRight: XSpacing.md,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  convInfo: { flex: 1 },
  convName: { ...XTypography.bodyMedium, fontWeight: '700', color: XColors.textPrimary },
  convPreview: { ...XTypography.bodySmall, color: XColors.textSecondary, marginTop: 2 },
  // Notifications
  notifItem: {
    flexDirection: 'row',
    padding: XSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
    alignItems: 'flex-start',
  },
  notifItemUnread: {
    backgroundColor: XColors.primary + '08',
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: XColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: XSpacing.md,
  },
  notifIconText: {
    fontSize: 18,
  },
  notifContent: {
    flex: 1,
  },
  notifAuthor: {
    ...XTypography.bodySmall,
    fontWeight: '700',
    color: XColors.textPrimary,
    marginBottom: 2,
  },
  notifMessage: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  notifTime: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    fontSize: 11,
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: XColors.primary,
    marginLeft: XSpacing.sm,
    marginTop: 8,
  },
});
