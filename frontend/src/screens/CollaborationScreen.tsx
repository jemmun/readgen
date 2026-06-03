import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, ActivityIndicator, Avatar } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { groupsApi, Group } from '../api/groups';
import { useI18n } from '../i18n/I18nContext';
import { XColors, XTypography, XSpacing, XBorderRadius, XAvatarSizes } from '../theme/xStyle';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: NavigationProp;
}

export default function CollaborationScreen({ navigation }: Props) {
  const { t } = useI18n();
  const [groups, setGroups] = useState<Group[]>([]);
  const [discoverGroups, setDiscoverGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      const [myRes, discoverRes] = await Promise.all([
        groupsApi.getAll(),
        groupsApi.discover().catch(() => ({ data: [] })),
      ]);
      setGroups(myRes.data);
      setDiscoverGroups(discoverRes.data);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const onRefresh = () => {
    setRefreshing(true);
    loadGroups();
  };

  const handleJoinGroup = async (groupId: number) => {
    try {
      await groupsApi.joinGroup(groupId);
      const [myRes, discoverRes] = await Promise.all([
        groupsApi.getAll(),
        groupsApi.discover().catch(() => ({ data: [] })),
      ]);
      setGroups(myRes.data);
      setDiscoverGroups(discoverRes.data);
    } catch (e) {
      console.error('Failed to join group:', e);
    }
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
        <Text style={styles.headerTitle}>{t('myGroups')}</Text>
        <TouchableOpacity
          style={[styles.discoverTab, showDiscover && styles.discoverTabActive]}
          onPress={() => setShowDiscover(!showDiscover)}
        >
          <Text style={[styles.discoverTabText, showDiscover && styles.discoverTabTextActive]}>
            🌐 {t('discoverGroups')}
          </Text>
        </TouchableOpacity>
      </View>

      {showDiscover ? (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={XColors.primary} />
          }
        >
          {discoverGroups.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>🌐</Text>
              <Text style={styles.emptyTitle}>{t('noPublicGroups')}</Text>
              <Text style={styles.emptyHint}>{t('noPublicGroupsHint')}</Text>
            </View>
          ) : (
            discoverGroups.map((group) => (
              <View key={group.id} style={styles.groupItem}>
                <TouchableOpacity
                  style={styles.groupInfo}
                  onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.groupAvatar}>
                    <Text style={styles.groupAvatarText}>
                      {(group.name[0] || 'G').toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.groupDetails}>
                    <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
                    {group.description ? (
                      <Text style={styles.groupDescription} numberOfLines={2}>{group.description}</Text>
                    ) : null}
                    <Text style={styles.metaText}>{group.member_count} {t('groupMembers')}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.joinButton}
                  onPress={() => handleJoinGroup(group.id)}
                >
                  <Text style={styles.joinButtonText}>{t('joinGroup')}</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      ) : groups.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>{t('noGroupsYet') || 'No Groups Yet'}</Text>
          <Text style={styles.emptyHint}>
            {t('createFirstGroupHint') || 'Create a group to collaborate with friends on novel writing'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={XColors.primary} />
          }
        >
          {groups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={styles.groupItem}
              onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
              activeOpacity={0.7}
            >
              <View style={styles.groupAvatar}>
                <Text style={styles.groupAvatarText}>
                  {(group.name[0] || 'G').toUpperCase()}
                </Text>
              </View>
              <View style={styles.groupInfo}>
                <View style={styles.groupNameRow}>
                  <Text style={styles.groupName} numberOfLines={1}>
                    {group.name}
                  </Text>
                  {group.is_private && (
                    <Text style={styles.privateBadge}>🔒</Text>
                  )}
                </View>
                {group.description ? (
                  <Text style={styles.groupDescription} numberOfLines={2}>
                    {group.description}
                  </Text>
                ) : null}
                <View style={styles.groupMeta}>
                  <Text style={styles.metaText}>
                    👤 {group.owner?.display_name || group.owner?.username}
                  </Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText}>
                    {group.member_count} members
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateGroup')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
        <Text style={styles.fabLabel}>{t('createNewGroup')}</Text>
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
  emptyHint: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
    textAlign: 'center',
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
    flex: 1,
  },
  discoverTab: {
    paddingHorizontal: XSpacing.md,
    paddingVertical: XSpacing.xs,
    borderRadius: XBorderRadius.full,
    borderWidth: 1,
    borderColor: XColors.border,
  },
  discoverTabActive: {
    backgroundColor: XColors.primary,
    borderColor: XColors.primary,
  },
  discoverTabText: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    fontWeight: '600',
  },
  discoverTabTextActive: {
    color: '#ffffff',
  },
  groupDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  joinButton: {
    backgroundColor: XColors.primary,
    paddingHorizontal: XSpacing.md,
    paddingVertical: XSpacing.sm,
    borderRadius: XBorderRadius.full,
    alignSelf: 'center',
  },
  joinButtonText: {
    ...XTypography.bodySmall,
    color: '#ffffff',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  groupItem: {
    flexDirection: 'row',
    padding: XSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
  },
  groupAvatar: {
    width: XAvatarSizes.large,
    height: XAvatarSizes.large,
    borderRadius: XBorderRadius.md,
    backgroundColor: XColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: XSpacing.md,
  },
  groupAvatarText: {
    ...XTypography.titleLarge,
    color: '#ffffff',
    fontWeight: '700',
  },
  groupInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  groupNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: XSpacing.xs,
  },
  groupName: {
    ...XTypography.titleLarge,
    color: XColors.textPrimary,
    fontWeight: '700',
  },
  privateBadge: {
    marginLeft: XSpacing.sm,
    fontSize: 14,
  },
  groupDescription: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    lineHeight: 18,
    marginBottom: XSpacing.sm,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },
  metaDot: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    marginHorizontal: XSpacing.xs,
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
