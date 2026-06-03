import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, FlatList } from 'react-native';
import { Text, TextInput, ActivityIndicator, Avatar } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { groupsApi, Group, GroupMember } from '../api/groups';
import { postsApi, Post } from '../api/posts';
import { useI18n } from '../i18n/I18nContext';
import { XColors, XTypography, XSpacing, XBorderRadius, XAvatarSizes } from '../theme/xStyle';
import { getAllTags, getTagBySlug, getSuggestions, TagDef } from '../utils/tags';
import { useAuth } from '../contexts/AuthContext';

type Props = StackScreenProps<RootStackParamList, 'GroupDetail'>;

export default function GroupDetailScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const { t } = useI18n();
  const { userId: currentUserId } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'approval' | 'chapters'>('chat');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [suggestions, setSuggestions] = useState<TagDef[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [generatingNovel, setGeneratingNovel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsName, setSettingsName] = useState('');
  const [settingsDesc, setSettingsDesc] = useState('');
  const [settingsPrivate, setSettingsPrivate] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [chapterAssignments, setChapterAssignments] = useState<any[]>([]);
  const allTags = getAllTags();

  const loadData = useCallback(async () => {
    try {
      const [groupRes, membersRes, postsRes] = await Promise.all([
        groupsApi.getById(groupId),
        groupsApi.getMembers(groupId),
        groupsApi.getPosts(groupId, activeTag || undefined),
      ]);
      setGroup(groupRes.data);
      setMembers(membersRes.data);
      setPosts((postsRes.data as any) || []);
      // Admin detection: prefer my_role from backend, fallback to members list
      let userRole = groupRes.data.my_role;
      if (!userRole && currentUserId) {
        const me = membersRes.data.find((m: GroupMember) => m.id === currentUserId);
        userRole = me?.role;
      }
      const isGroupAdmin = userRole === 'owner' || userRole === 'admin';
      setIsAdmin(isGroupAdmin);
      console.log('[GroupDetail] role:', userRole, 'isAdmin:', isGroupAdmin, 'my_role:', groupRes.data.my_role);
    } catch (error) {
      console.error('Failed to load group:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId, activeTag, currentUserId]);

  useEffect(() => {
    setIsAdmin(false); // reset admin state when switching groups
    setActiveTab('chat');
    setPendingPosts([]);
    loadData();
  }, [groupId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load pending posts for admin approval tab
  const loadPending = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await groupsApi.getPosts(groupId, activeTag || undefined, 'pending');
      setPendingPosts((res.data as any) || []);
    } catch (e) {
      console.error('Failed to load pending:', e);
    }
  }, [groupId, activeTag, isAdmin]);

  useEffect(() => {
    if (activeTab === 'approval') {
      loadPending();
    }
  }, [activeTab, loadPending]);

  // Poll for new messages every 3 seconds for near-real-time feel
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        if (activeTab === 'chat') {
          const res = await groupsApi.getPosts(groupId, activeTag || undefined);
          setPosts((res.data as any) || []);
        } else if (activeTab === 'approval' && isAdmin) {
          const res = await groupsApi.getPosts(groupId, activeTag || undefined, 'pending');
          setPendingPosts((res.data as any) || []);
        }
      } catch (e) {
        // silent poll
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [groupId, activeTag, activeTab, isAdmin]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await postsApi.create({ content: message, group_id: groupId });
      setMessage('');
      setSuggestions([]);
      const res = await groupsApi.getPosts(groupId, activeTag || undefined);
      setPosts((res.data as any) || []);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleMessageChange = (text: string) => {
    setMessage(text);
    setSuggestions(getSuggestions(text));
  };

  const handleSelectSuggestion = (tag: TagDef) => {
    const parts = message.split(/\s+/, 1);
    const rest = parts.length > 1 ? parts[1] : '';
    setMessage(tag.prefix + (rest ? ' ' + rest : ' '));
    setSuggestions([]);
  };

  const handleToggleTag = (tagSlug: string) => {
    setActiveTag((prev) => (prev === tagSlug ? null : tagSlug));
  };

  const handleApprove = async (postId: number) => {
    try {
      await groupsApi.approvePost(groupId, postId, approvalNote.trim() || undefined);
      setApprovalNote('');
      const [chatRes, pendingRes] = await Promise.all([
        groupsApi.getPosts(groupId, activeTag || undefined),
        groupsApi.getPosts(groupId, activeTag || undefined, 'pending'),
      ]);
      setPosts((chatRes.data as any) || []);
      setPendingPosts((pendingRes.data as any) || []);
    } catch (e) { console.error('Approve failed:', e); }
  };

  const handleReject = async (postId: number) => {
    try {
      await groupsApi.rejectPost(groupId, postId, approvalNote.trim() || undefined);
      setApprovalNote('');
      const [chatRes, pendingRes] = await Promise.all([
        groupsApi.getPosts(groupId, activeTag || undefined),
        groupsApi.getPosts(groupId, activeTag || undefined, 'pending'),
      ]);
      setPosts((chatRes.data as any) || []);
      setPendingPosts((pendingRes.data as any) || []);
    } catch (e) { console.error('Reject failed:', e); }
  };

  const handleGenerateNovel = async () => {
    setGeneratingNovel(true);
    try {
      const res = await groupsApi.generateNovelDesign(groupId);
      const design = res.data;
      navigation.navigate('CreateNovel', {
        title: design.title,
        theme_description: design.theme_description,
        genre: design.genre,
        style: design.style,
        tone: design.tone,
        setting: design.setting,
        protagonist_info: design.protagonist_info,
        target_audience: design.target_audience,
        language: design.language,
        max_chapters: design.max_chapters,
      });
    } catch (e: any) {
      console.error('Generate novel failed:', e);
      alert(e.response?.data?.detail || 'Failed to generate novel design');
    } finally {
      setGeneratingNovel(false);
    }
  };

  // ── Role management ──
  const isOwner = group?.my_role === 'owner';

  const handleToggleRole = async (memberId: number, currentRole: string) => {
    if (!isOwner) return;
    const roleCycle: Record<string, string> = {
      'member': 'editor', 'editor': 'reviewer', 'reviewer': 'admin', 'admin': 'member',
    };
    const newRole = roleCycle[currentRole] || 'member';
    try {
      await groupsApi.updateMemberRole(groupId, memberId, newRole);
      const membersRes = await groupsApi.getMembers(groupId);
      setMembers(membersRes.data);
      const groupRes = await groupsApi.getById(groupId);
      setGroup(groupRes.data);
      const isNowAdmin = groupRes.data.my_role === 'owner' || groupRes.data.my_role === 'admin' || groupRes.data.my_role === 'reviewer';
      setIsAdmin(isNowAdmin);
    } catch (e) {
      console.error('Failed to update role:', e);
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await groupsApi.removeMember(groupId, currentUserId!);
      navigation.goBack();
    } catch (e) {
      console.error('Failed to leave group:', e);
    }
  };

  const handleKickMember = async (memberId: number) => {
    try {
      await groupsApi.removeMember(groupId, memberId);
      const membersRes = await groupsApi.getMembers(groupId);
      setMembers(membersRes.data);
    } catch (e) {
      console.error('Failed to remove member:', e);
    }
  };

  const handleOpenSettings = () => {
    if (!group) return;
    setSettingsName(group.name);
    setSettingsDesc(group.description || '');
    setSettingsPrivate(group.is_private);
    setShowSettings(true);
  };

  const handleSaveSettings = async () => {
    try {
      await groupsApi.update(groupId, {
        name: settingsName.trim() || undefined,
        description: settingsDesc.trim() || undefined,
        is_private: settingsPrivate,
      });
      const groupRes = await groupsApi.getById(groupId);
      setGroup(groupRes.data);
      setShowSettings(false);
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return date.toLocaleDateString();
  };

  if (loading || !group) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={XColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Group Header */}
      <View style={styles.groupHeader}>
        <View style={styles.headerTop}>
          <View style={styles.groupAvatar}>
            <Text style={styles.groupAvatarText}>
              {(group.name[0] || 'G').toUpperCase()}
            </Text>
          </View>
          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{group.name}</Text>
            {group.description ? (
              <Text style={styles.groupDesc}>{group.description}</Text>
            ) : null}
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.membersButton}
            onPress={() => setShowMembers(!showMembers)}
          >
            <Text style={styles.membersButtonText}>
              {showMembers ? 'Hide' : ''} Members ({members.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => navigation.navigate('SearchUsers')}
          >
            <Text style={styles.inviteButtonText}>+ Invite</Text>
          </TouchableOpacity>
          {!isOwner && (
            <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveGroup}>
              <Text style={styles.leaveButtonText}>Leave</Text>
            </TouchableOpacity>
          )}
          {isOwner && !showSettings && (
            <TouchableOpacity style={styles.settingsButton} onPress={handleOpenSettings}>
              <Text style={styles.settingsButtonText}>⚙ Settings</Text>
            </TouchableOpacity>
          )}
        </View>
        {showSettings && (
          <View style={styles.settingsForm}>
            <TextInput
              label="Group Name"
              value={settingsName}
              onChangeText={setSettingsName}
              style={styles.settingsInput}
              mode="outlined"
              outlineColor={XColors.border}
              activeOutlineColor={XColors.primary}
              textColor={XColors.textPrimary}
            />
            <TextInput
              label="Description"
              value={settingsDesc}
              onChangeText={setSettingsDesc}
              style={styles.settingsInput}
              mode="outlined"
              outlineColor={XColors.border}
              activeOutlineColor={XColors.primary}
              textColor={XColors.textPrimary}
              multiline
            />
            <TouchableOpacity style={styles.settingsToggle} onPress={() => setSettingsPrivate(!settingsPrivate)}>
              <Text style={styles.settingsToggleText}>{settingsPrivate ? '🔒 Private' : '🌐 Public'}</Text>
            </TouchableOpacity>
            <View style={styles.settingsActions}>
              <TouchableOpacity onPress={() => setShowSettings(false)} style={styles.settingsCancelBtn}>
                <Text style={styles.settingsCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveSettings} style={styles.settingsSaveBtn}>
                <Text style={styles.settingsSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {isAdmin && (
          <TouchableOpacity
            style={styles.generateNovelButton}
            onPress={handleGenerateNovel}
            disabled={generatingNovel}
          >
            <Text style={styles.generateNovelButtonText}>
              {generatingNovel ? 'Generating...' : '📚 Generate Novel'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Members List (expandable) */}
      {showMembers && (
        <ScrollView horizontal style={styles.membersScroll} contentContainerStyle={styles.membersContent}>
          {members.map((m) => {
            const canManage = isOwner && m.role !== 'owner';
            return (
            <TouchableOpacity
              key={m.id}
              style={styles.memberItem}
              onPress={() => {
                if (canManage) {
                  handleToggleRole(m.id, m.role);
                } else {
                  navigation.navigate('UserProfile', { userId: m.id });
                }
              }}
              onLongPress={() => {
                if (canManage) {
                  handleToggleRole(m.id, m.role);
                }
              }}
            >
              <View style={[styles.memberAvatar, m.role === 'admin' && styles.memberAvatarAdmin]}>
                <Text style={styles.memberAvatarText}>
                  {(m.display_name || m.username)[0].toUpperCase()}
                </Text>
              </View>
              <Text style={styles.memberName} numberOfLines={1}>
                {m.display_name || m.username}
              </Text>
              <View style={styles.roleBadgeRow}>
                {m.role === 'owner' && <Text style={styles.roleBadgeOwner}>👑 Owner</Text>}
                {m.role === 'admin' && <Text style={styles.roleBadgeAdmin}>⭐ Admin</Text>}
                {m.role === 'member' && canManage && <Text style={styles.roleBadgeMember}>👤 Member</Text>}
              </View>
              {canManage && (
                <Text style={styles.roleHint}>tap to toggle</Text>
              )}
              {isOwner && m.role !== 'owner' && (
                <TouchableOpacity onPress={() => handleKickMember(m.id)} style={styles.kickBtn}>
                  <Text style={styles.kickBtnText}>✕</Text>
                </TouchableOpacity>
              )}
              {isOwner && m.role !== 'owner' && (
                <TouchableOpacity
                  onPress={() => {
                    const chNum = prompt('Assign which chapter number?');
                    if (chNum) groupsApi.assignChapter(groupId, parseInt(chNum), m.id).catch(e => console.error(e));
                  }}
                  style={styles.assignBtn}
                >
                  <Text style={styles.assignBtnText}>📝</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )})}
        </ScrollView>
      )}

      {/* Admin Approval Tab Bar */}
      {isAdmin && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'chat' && styles.tabItemActive]}
            onPress={() => setActiveTab('chat')}
          >
            <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>💬 Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'approval' && styles.tabItemActive]}
            onPress={() => setActiveTab('approval')}
          >
            <Text style={[styles.tabText, activeTab === 'approval' && styles.tabTextActive]}>
              ⏳ Pending {pendingPosts.length > 0 ? `(${pendingPosts.length})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'chapters' && styles.tabItemActive]}
            onPress={() => setActiveTab('chapters')}
          >
            <Text style={[styles.tabText, activeTab === 'chapters' && styles.tabTextActive]}>
              📖 Chapters
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tag Filter Chips — shared between Chat and Pending */}
      <ScrollView
        horizontal
        style={styles.chipScroll}
        contentContainerStyle={styles.chipContent}
        showsHorizontalScrollIndicator={false}
      >
        {/* All / Clear filter */}
        <TouchableOpacity
          style={[styles.chip, !activeTag && styles.chipActive]}
          onPress={() => setActiveTag(null)}
        >
          <Text style={[styles.chipText, !activeTag && styles.chipTextActive]}>
            {activeTab === 'approval' ? 'All Pending' : 'All'}
          </Text>
        </TouchableOpacity>
        {allTags.map((tag) => (
          <TouchableOpacity
            key={tag.slug}
            style={[
              styles.chip,
              activeTag === tag.slug && { backgroundColor: tag.color + '20', borderColor: tag.color },
            ]}
            onPress={() => handleToggleTag(tag.slug)}
          >
            <Text style={styles.chipEmoji}>{tag.emoji}</Text>
            <Text
              style={[
                styles.chipText,
                activeTag === tag.slug && { color: tag.color, fontWeight: '700' },
              ]}
            >
              {tag.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Messages Feed */}
      {activeTab === 'chat' && (
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        style={styles.feed}
        contentContainerStyle={styles.feedContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={XColors.primary} />
        }
        renderItem={({ item }) => {
          const tagDef = item.tag ? getTagBySlug(item.tag) : undefined;
          const isPending = item.status === 'pending';
          const isRejected = item.status === 'rejected';
          const isOwnMessage = item.user_id === currentUserId;
          return (
            <View style={[styles.messageItem, isPending && styles.messageItemPending, isRejected && styles.messageItemRejected]}>
            <TouchableOpacity
              onPress={() => item.author && navigation.navigate('UserProfile', { userId: item.author.id })}
              style={styles.messageAvatar}
            >
              <View style={[styles.msgAvatarCircle, tagDef && { backgroundColor: tagDef.color }, isPending && styles.msgAvatarPending]}>
                <Text style={styles.msgAvatarText}>
                  {(item.author?.display_name || item.author?.username || 'U')[0].toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.messageContent}>
              <View style={styles.messageHeader}>
                <Text style={styles.messageAuthor}>
                  {item.author?.display_name || item.author?.username}
                </Text>
                {tagDef && (
                  <View style={[styles.tagBadge, { backgroundColor: tagDef.color + '20' }]}>
                    <Text style={styles.tagBadgeEmoji}>{tagDef.emoji}</Text>
                    <Text style={[styles.tagBadgeText, { color: tagDef.color }]}>{tagDef.label}</Text>
                  </View>
                )}
                {isPending && (
                  <View style={styles.statusBadgePending}>
                    <Text style={styles.statusTextPending}>⏳ Pending</Text>
                  </View>
                )}
                {isRejected && (
                  <View style={styles.statusBadgeRejected}>
                    <Text style={styles.statusTextRejected}>❌ Rejected</Text>
                  </View>
                )}
                <Text style={styles.messageTime}>
                  {formatTimestamp(item.created_at)}
                </Text>
              </View>
              <Text style={[styles.messageText, isPending && styles.messageTextPending]}>{item.content}</Text>

              {/* Admin approve/reject buttons */}
              {isAdmin && isPending && (
                <View style={styles.adminActions}>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApprove(item.id)}
                  >
                    <Text style={styles.approveButtonText}>✓ Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleReject(item.id)}
                  >
                    <Text style={styles.rejectButtonText}>✗ Reject</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Non-admin: show pending notification for own message */}
              {!isAdmin && isPending && isOwnMessage && (
                <Text style={styles.pendingNotice}>Waiting for admin approval...</Text>
              )}
            </View>
          </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyFeed}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
          </View>
        }
      />
      )}
      
      {activeTab === 'approval' && (
      <FlatList
        data={pendingPosts}
        keyExtractor={(item) => item.id.toString()}
        style={styles.feed}
        contentContainerStyle={styles.feedContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={XColors.primary} />
        }
        renderItem={({ item }) => {
          const tagDef = item.tag ? getTagBySlug(item.tag) : undefined;
          return (
            <View style={[styles.messageItem, styles.messageItemPending]}>
              <TouchableOpacity
                onPress={() => item.author && navigation.navigate('UserProfile', { userId: item.author.id })}
                style={styles.messageAvatar}
              >
                <View style={[styles.msgAvatarCircle, tagDef && { backgroundColor: tagDef.color }, styles.msgAvatarPending]}>
                  <Text style={styles.msgAvatarText}>
                    {(item.author?.display_name || item.author?.username || 'U')[0].toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={styles.messageContent}>
                <View style={styles.messageHeader}>
                  <Text style={styles.messageAuthor}>{item.author?.display_name || item.author?.username}</Text>
                  {tagDef && (
                    <View style={[styles.tagBadge, { backgroundColor: tagDef.color + '20' }]}>
                      <Text style={styles.tagBadgeEmoji}>{tagDef.emoji}</Text>
                      <Text style={[styles.tagBadgeText, { color: tagDef.color }]}>{tagDef.label}</Text>
                    </View>
                  )}
                  <View style={styles.statusBadgePending}>
                    <Text style={styles.statusTextPending}>⏳ Pending</Text>
                  </View>
                  <Text style={styles.messageTime}>{formatTimestamp(item.created_at)}</Text>
                </View>
                <Text style={[styles.messageText, styles.messageTextPending]}>{item.content}</Text>
                {item.approval_note && (
                  <Text style={styles.approvalNoteText}>📝 {item.approval_note}</Text>
                )}
                <View style={styles.adminActions}>
                  <TextInput
                    value={approvalNote}
                    onChangeText={setApprovalNote}
                    placeholder="Add note (optional)..."
                    mode="outlined"
                    style={styles.approvalNoteInput}
                    outlineColor={XColors.border}
                    activeOutlineColor={XColors.primary}
                    textColor={XColors.textPrimary}
                    dense
                  />
                  <TouchableOpacity style={styles.approveButton} onPress={() => handleApprove(item.id)}>
                    <Text style={styles.approveButtonText}>✓ Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectButton} onPress={() => handleReject(item.id)}>
                    <Text style={styles.rejectButtonText}>✗ Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyFeed}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyText}>No pending messages to review!</Text>
          </View>
        }
      />
      )}
      
      {activeTab === 'chapters' && (
      <ScrollView style={styles.kanbanContainer}>
        <View style={styles.kanbanHeader}>
          <Text style={styles.kanbanTitle}>Chapter Assignments</Text>
          <Text style={styles.kanbanSubtitle}>Track who is working on which chapter</Text>
        </View>
        
        {members.length === 0 ? (
          <View style={styles.emptyKanban}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyText}>No members to assign chapters</Text>
          </View>
        ) : (
          <View style={styles.kanbanGrid}>
            {members.map((member) => {
              // Count chapters assigned to this member (mock data for now)
              const chapterCount = 0; // TODO: Fetch from backend
              return (
                <View key={member.id} style={styles.kanbanCard}>
                  <View style={styles.kanbanCardHeader}>
                    <Avatar.Text 
                      size={40} 
                      label={(member.display_name || member.username || 'U')[0].toUpperCase()} 
                      color="#fff"
                      style={{ backgroundColor: XColors.primary }}
                    />
                    <View style={styles.kanbanUserInfo}>
                      <Text style={styles.kanbanUserName}>
                        {member.display_name || member.username}
                      </Text>
                      <Text style={styles.kanbanUserRole}>{member.role}</Text>
                    </View>
                  </View>
                  <View style={styles.kanbanStats}>
                    <View style={styles.kanbanStat}>
                      <Text style={styles.kanbanStatValue}>{chapterCount}</Text>
                      <Text style={styles.kanbanStatLabel}>Chapters</Text>
                    </View>
                    <View style={styles.kanbanStat}>
                      <Text style={styles.kanbanStatValue}>0</Text>
                      <Text style={styles.kanbanStatLabel}>Pending</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.kanbanAssignBtn}>
                    <Text style={styles.kanbanAssignBtnText}>+ Assign Chapter</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
      )}

      {/* Message Input */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsHint}>Select a tag:</Text>
          {suggestions.map((tag) => (
            <TouchableOpacity
              key={tag.slug}
              style={styles.suggestionItem}
              onPress={() => handleSelectSuggestion(tag)}
            >
              <Text style={styles.suggestionEmoji}>{tag.emoji}</Text>
              <Text style={styles.suggestionPrefix}>{tag.prefix}</Text>
              <Text style={styles.suggestionDesc}>{tag.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Active tag indicator */}
      {message.startsWith('/') && !suggestions.length && (
        <View style={styles.noMatchHint}>
          <Text style={styles.noMatchText}>
            No matching tag. Try /plot, /character, /chapter...
          </Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          value={message}
          onChangeText={handleMessageChange}
          placeholder={activeTag ? `Filtering: ${getTagBySlug(activeTag)?.label || activeTag}...` : 'Type / for tags...'}
          style={styles.messageInput}
          mode="outlined"
          outlineColor={XColors.border}
          activeOutlineColor={XColors.primary}
          textColor={XColors.textPrimary}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, (!message.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!message.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
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
  groupHeader: {
    padding: XSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: XSpacing.md,
  },
  groupAvatar: {
    width: 56,
    height: 56,
    borderRadius: XBorderRadius.md,
    backgroundColor: XColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: XSpacing.md,
  },
  groupAvatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    ...XTypography.headlineMedium,
    color: XColors.textPrimary,
    fontWeight: '700',
    marginBottom: XSpacing.xs,
  },
  groupDesc: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: XSpacing.sm,
  },
  membersButton: {
    paddingHorizontal: XSpacing.lg,
    paddingVertical: XSpacing.sm,
    borderRadius: XBorderRadius.full,
    borderWidth: 1,
    borderColor: XColors.border,
  },
  membersButtonText: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    fontWeight: '600',
  },
  inviteButton: {
    paddingHorizontal: XSpacing.lg,
    paddingVertical: XSpacing.sm,
    borderRadius: XBorderRadius.full,
    backgroundColor: XColors.primary,
  },
  inviteButtonText: {
    ...XTypography.bodySmall,
    color: '#ffffff',
    fontWeight: '600',
  },
  membersScroll: {
    maxHeight: 80,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
  },
  membersContent: {
    padding: XSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberItem: {
    alignItems: 'center',
    marginRight: XSpacing.lg,
    width: 56,
  },
  memberAvatar: {
    width: XAvatarSizes.medium,
    height: XAvatarSizes.medium,
    borderRadius: XBorderRadius.full,
    backgroundColor: XColors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: XSpacing.xs,
  },
  memberAvatarText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  memberName: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  // Role badges
  memberAvatarAdmin: {
    backgroundColor: '#f59e0b',
  },
  roleBadgeRow: {
    marginTop: 2,
    alignItems: 'center',
  },
  roleBadgeOwner: {
    fontSize: 9,
    color: '#f59e0b',
    fontWeight: '700',
  },
  roleBadgeAdmin: {
    fontSize: 9,
    color: '#10b981',
    fontWeight: '700',
  },
  roleBadgeMember: {
    fontSize: 9,
    color: '#9ca3af',
    fontWeight: '600',
  },
  roleHint: {
    fontSize: 8,
    color: XColors.primary,
    marginTop: 1,
    fontWeight: '600',
  },
  leaveButton: {
    paddingHorizontal: XSpacing.lg,
    paddingVertical: XSpacing.sm,
    borderRadius: XBorderRadius.full,
    backgroundColor: XColors.error,
  },
  leaveButtonText: {
    ...XTypography.bodySmall,
    color: '#ffffff',
    fontWeight: '600',
  },
  kickBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: XColors.error,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kickBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  settingsButton: {
    paddingHorizontal: XSpacing.md,
    paddingVertical: XSpacing.sm,
    borderRadius: XBorderRadius.full,
    borderWidth: 1,
    borderColor: XColors.border,
  },
  settingsButtonText: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    fontWeight: '600',
  },
  settingsForm: {
    marginTop: XSpacing.md,
  },
  settingsInput: {
    marginBottom: XSpacing.sm,
    backgroundColor: XColors.background,
  },
  settingsToggle: {
    paddingVertical: XSpacing.sm,
    marginBottom: XSpacing.sm,
  },
  settingsToggleText: {
    ...XTypography.bodyMedium,
    color: XColors.primary,
    fontWeight: '600',
  },
  settingsActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: XSpacing.md,
  },
  settingsCancelBtn: {
    paddingHorizontal: XSpacing.lg,
    paddingVertical: XSpacing.sm,
  },
  settingsCancelText: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
  },
  settingsSaveBtn: {
    backgroundColor: XColors.primary,
    paddingHorizontal: XSpacing.lg,
    paddingVertical: XSpacing.sm,
    borderRadius: XBorderRadius.full,
  },
  settingsSaveText: {
    ...XTypography.bodyMedium,
    color: '#ffffff',
    fontWeight: '700',
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    padding: XSpacing.md,
  },
  messageItem: {
    flexDirection: 'row',
    marginBottom: XSpacing.md,
  },
  messageAvatar: {
    marginRight: XSpacing.sm,
  },
  msgAvatarCircle: {
    width: XAvatarSizes.small,
    height: XAvatarSizes.small,
    borderRadius: XBorderRadius.full,
    backgroundColor: XColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  msgAvatarText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: XSpacing.xs,
  },
  messageAuthor: {
    ...XTypography.bodySmall,
    color: XColors.textPrimary,
    fontWeight: '700',
    marginRight: XSpacing.sm,
  },
  messageTime: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },
  messageText: {
    ...XTypography.bodyMedium,
    color: XColors.textPrimary,
    lineHeight: XTypography.bodyMedium.lineHeight,
  },
  emptyFeed: {
    alignItems: 'center',
    padding: XSpacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: XSpacing.md,
  },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
    backgroundColor: '#ffffff',
  },
  tabItem: {
    flex: 1,
    paddingVertical: XSpacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: XColors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#536471',
  },
  tabTextActive: {
    color: XColors.primary,
    fontWeight: '700',
  },
  emptyText: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: XSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: XColors.border,
    backgroundColor: XColors.background,
  },
  messageInput: {
    flex: 1,
    marginRight: XSpacing.sm,
    backgroundColor: XColors.background,
  },
  sendButton: {
    backgroundColor: XColors.primary,
    paddingHorizontal: XSpacing.lg,
    paddingVertical: XSpacing.sm,
    borderRadius: XBorderRadius.full,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    ...XTypography.bodySmall,
    color: '#ffffff',
    fontWeight: '700',
  },
  chipScroll: {
    maxHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
  },
  chipContent: {
    paddingHorizontal: XSpacing.sm,
    paddingVertical: XSpacing.xs,
    gap: XSpacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: XSpacing.md,
    paddingVertical: XSpacing.xs,
    borderRadius: XBorderRadius.full,
    borderWidth: 1,
    borderColor: XColors.border,
    backgroundColor: XColors.surface,
    marginRight: XSpacing.xs,
  },
  chipActive: {
    backgroundColor: XColors.primary,
    borderColor: XColors.primary,
  },
  chipEmoji: {
    fontSize: 13,
    marginRight: 4,
  },
  chipText: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: XBorderRadius.sm,
    marginRight: XSpacing.sm,
  },
  tagBadgeEmoji: {
    fontSize: 11,
    marginRight: 3,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  suggestionsContainer: {
    padding: XSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: XColors.border,
    backgroundColor: XColors.surface,
    maxHeight: 200,
  },
  suggestionsHint: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    marginBottom: XSpacing.xs,
    fontWeight: '600',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: XSpacing.sm,
    paddingHorizontal: XSpacing.sm,
    borderRadius: XBorderRadius.sm,
    marginBottom: 2,
  },
  suggestionEmoji: {
    fontSize: 18,
    marginRight: XSpacing.sm,
  },
  suggestionPrefix: {
    ...XTypography.bodySmall,
    color: XColors.primary,
    fontWeight: '700',
    marginRight: XSpacing.sm,
    fontFamily: 'monospace',
  },
  suggestionDesc: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },
  noMatchHint: {
    padding: XSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: XColors.border,
    backgroundColor: '#fff3f3',
  },
  noMatchText: {
    ...XTypography.bodySmall,
    color: XColors.error,
  },
  // Status styles
  messageItemPending: {
    backgroundColor: '#fef9e7',
    borderRadius: XBorderRadius.sm,
    paddingVertical: XSpacing.xs,
  },
  messageItemRejected: {
    backgroundColor: '#fef2f2',
    borderRadius: XBorderRadius.sm,
    opacity: 0.7,
  },
  msgAvatarPending: {
    opacity: 0.6,
  },
  statusBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: XBorderRadius.sm,
    backgroundColor: '#f59e0b20',
    marginRight: XSpacing.sm,
  },
  statusTextPending: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
  },
  statusBadgeRejected: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: XBorderRadius.sm,
    backgroundColor: '#ef444420',
    marginRight: XSpacing.sm,
  },
  statusTextRejected: {
    fontSize: 10,
    fontWeight: '700',
    color: '#dc2626',
  },
  messageTextPending: {
    color: XColors.textSecondary,
    fontStyle: 'italic',
  },
  adminActions: {
    flexDirection: 'row',
    marginTop: XSpacing.sm,
    gap: XSpacing.sm,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00ba7c',
    paddingHorizontal: XSpacing.md,
    paddingVertical: XSpacing.xs,
    borderRadius: XBorderRadius.full,
  },
  approveButtonText: {
    ...XTypography.bodySmall,
    color: '#ffffff',
    fontWeight: '700',
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: XSpacing.md,
    paddingVertical: XSpacing.xs,
    borderRadius: XBorderRadius.full,
  },
  rejectButtonText: {
    ...XTypography.bodySmall,
    color: '#ffffff',
    fontWeight: '700',
  },
  pendingNotice: {
    ...XTypography.bodySmall,
    color: '#b45309',
    fontStyle: 'italic',
    marginTop: XSpacing.xs,
  },
  generateNovelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: XColors.primary,
    paddingHorizontal: XSpacing.md,
    paddingVertical: XSpacing.sm,
    borderRadius: XBorderRadius.full,
    marginTop: XSpacing.sm,
  },
  generateNovelButtonText: {
    ...XTypography.bodySmall,
    color: '#ffffff',
    fontWeight: '700',
  },
  approvalNoteText: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 4,
  },
  approvalNoteInput: {
    flex: 1,
    marginRight: 8,
    minHeight: 36,
    backgroundColor: XColors.background,
    fontSize: 13,
  },
  assignBtn: {
    padding: 4,
    marginLeft: 4,
  },
  assignBtnText: {
    fontSize: 16,
  },
  // Kanban styles
  kanbanContainer: {
    flex: 1,
    padding: XSpacing.lg,
  },
  kanbanHeader: {
    marginBottom: XSpacing.xl,
  },
  kanbanTitle: {
    ...XTypography.titleLarge,
    fontWeight: '700',
    color: XColors.textPrimary,
    marginBottom: 4,
  },
  kanbanSubtitle: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
  },
  emptyKanban: {
    alignItems: 'center',
    padding: XSpacing.xl,
  },
  kanbanGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: XSpacing.md,
  },
  kanbanCard: {
    width: '48%',
    backgroundColor: XColors.surface,
    borderRadius: XBorderRadius.md,
    padding: XSpacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  kanbanCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: XSpacing.md,
  },
  kanbanUserInfo: {
    marginLeft: XSpacing.sm,
    flex: 1,
  },
  kanbanUserName: {
    ...XTypography.bodyMedium,
    fontWeight: '700',
    color: XColors.textPrimary,
  },
  kanbanUserRole: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    textTransform: 'capitalize',
  },
  kanbanStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: XSpacing.md,
    paddingVertical: XSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: XColors.border,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
  },
  kanbanStat: {
    alignItems: 'center',
  },
  kanbanStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: XColors.primary,
  },
  kanbanStatLabel: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    marginTop: 2,
  },
  kanbanAssignBtn: {
    backgroundColor: XColors.primary + '15',
    paddingVertical: XSpacing.sm,
    borderRadius: XBorderRadius.sm,
    alignItems: 'center',
  },
  kanbanAssignBtnText: {
    color: XColors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
});
