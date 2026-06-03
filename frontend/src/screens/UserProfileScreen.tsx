import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Text, ActivityIndicator, TextInput } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { usersApi, UserProfile, UserStats, WriterStats, TimelineItem } from '../api/users';
import { authApi } from '../api/auth';
import { bookmarksApi, BookmarkItem } from '../api/bookmarks';
import { Novel } from '../types';
import { XColors, XTypography, XSpacing, XBorderRadius, XAvatarSizes } from '../theme/xStyle';

type UserProfileScreenProps = StackScreenProps<RootStackParamList, 'UserProfile'>;

export default function UserProfileScreen({ navigation, route }: UserProfileScreenProps) {
  const { userId } = route.params;
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [posts, setPosts] = useState<any[]>([]);
  const [novels, setNovels] = useState<Novel[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'novels' | 'bookmarks'>('posts');
  const [writerStats, setWriterStats] = useState<WriterStats | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [userRes, statsRes, meRes, postsRes, novelsRes, writerStatsRes, timelineRes] = await Promise.all([
        usersApi.getById(userId),
        usersApi.getStats(userId),
        authApi.me().catch(() => null),
        usersApi.getPosts(userId),
        usersApi.getNovels(userId),
        usersApi.getWriterStats(userId),
        usersApi.getWritingTimeline(userId, 10),
      ]);
      setUser(userRes.data);
      setStats(statsRes.data);
      setPosts(postsRes.data);
      setNovels(novelsRes.data);
      setWriterStats(writerStatsRes.data);
      setTimeline(timelineRes.data);
      if (meRes) {
        setCurrentUser(meRes.data);
        if (meRes.data.id !== userId) {
          const followRes = await usersApi.isFollowing(userId);
          setIsFollowing(followRes.data.is_following);
        }
        // Load bookmarks if viewing own profile
        if (meRes.data.id === userId) {
          const bookmarksRes = await bookmarksApi.getMine();
          setBookmarks(bookmarksRes.data);
        }
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFollowToggle = async () => {
    if (!currentUser) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await usersApi.unfollow(userId);
        setIsFollowing(false);
      } else {
        await usersApi.follow(userId);
        setIsFollowing(true);
      }
      const statsRes = await usersApi.getStats(userId);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Follow toggle failed:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const isMe = currentUser?.id === userId;

  const handleEditProfile = () => {
    if (!user) return;
    setEditDisplayName(user.display_name || '');
    setEditBio(user.bio || '');
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    try {
      await usersApi.updateProfile({
        display_name: editDisplayName.trim() || undefined,
        bio: editBio.trim() || undefined,
      });
      const userRes = await usersApi.getById(userId);
      setUser(userRes.data);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  if (loading || !user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.largeAvatar}>
            <Text style={styles.largeAvatarText}>
              {(user.display_name || user.username)[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.displayName}>
            {user.display_name || user.username}
          </Text>
          <Text style={styles.username}>
            @{user.username}
          </Text>
          {user.bio && (
            <Text style={styles.bio}>
              {user.bio}
            </Text>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats?.following_count || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats?.follower_count || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats?.post_count || 0}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats?.novel_count || 0}</Text>
              <Text style={styles.statLabel}>Novels</Text>
            </View>
          </View>

          {isMe && !isEditing && (
            <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
          {isEditing && (
            <View style={styles.editForm}>
              <TextInput
                label="Display Name"
                value={editDisplayName}
                onChangeText={setEditDisplayName}
                style={styles.editInput}
                mode="outlined"
                outlineColor={XColors.border}
                activeOutlineColor={XColors.primary}
                textColor={XColors.textPrimary}
              />
              <TextInput
                label="Bio"
                value={editBio}
                onChangeText={setEditBio}
                style={styles.editInput}
                mode="outlined"
                outlineColor={XColors.border}
                activeOutlineColor={XColors.primary}
                textColor={XColors.textPrimary}
                multiline
              />
              <View style={styles.editActions}>
                <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.editCancelBtn}>
                  <Text style={styles.editCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveProfile} style={styles.editSaveBtn}>
                  <Text style={styles.editSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {!isMe && currentUser && (
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followingButton]}
              onPress={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={isFollowing ? XColors.primary : '#ffffff'} />
              ) : (
                <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              )}
            </TouchableOpacity>
          )}
          {!isMe && currentUser && (
            <TouchableOpacity
              style={styles.messageButton}
              onPress={() => navigation.navigate('Chat', { userId, userName: user?.display_name || user?.username || 'User' })}
            >
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Writer Statistics Section */}
        {writerStats && writerStats.total_novels > 0 && (
          <>
            <View style={styles.sectionDivider} />
            <View style={styles.writerStatsSection}>
              <Text style={styles.sectionTitle}>Writer Statistics</Text>
              <View style={styles.writerStatsGrid}>
                <View style={styles.writerStatCard}>
                  <Text style={styles.writerStatIcon}>📝</Text>
                  <Text style={styles.writerStatValue}>{writerStats.total_words.toLocaleString()}</Text>
                  <Text style={styles.writerStatLabel}>Total Words</Text>
                </View>
                <View style={styles.writerStatCard}>
                  <Text style={styles.writerStatIcon}>📚</Text>
                  <Text style={styles.writerStatValue}>{writerStats.total_chapters}</Text>
                  <Text style={styles.writerStatLabel}>Chapters</Text>
                </View>
                <View style={styles.writerStatCard}>
                  <Text style={styles.writerStatIcon}>⭐</Text>
                  <Text style={styles.writerStatValue}>{writerStats.avg_rating.toFixed(1)}</Text>
                  <Text style={styles.writerStatLabel}>Avg Rating</Text>
                </View>
                <View style={styles.writerStatCard}>
                  <Text style={styles.writerStatIcon}>💬</Text>
                  <Text style={styles.writerStatValue}>{writerStats.total_reviews}</Text>
                  <Text style={styles.writerStatLabel}>Reviews</Text>
                </View>
              </View>
              {writerStats.writing_since && (
                <Text style={styles.writingSince}>
                  Writing since {new Date(writerStats.writing_since).toLocaleDateString()}
                </Text>
              )}
              {writerStats.most_popular_novel && writerStats.most_popular_novel.review_count > 0 && (
                <View style={styles.popularNovelCard}>
                  <Text style={styles.popularNovelLabel}>Most Popular Novel</Text>
                  <Text style={styles.popularNovelTitle}>{writerStats.most_popular_novel.title}</Text>
                  <Text style={styles.popularNovelStats}>
                    {writerStats.most_popular_novel.review_count} review{writerStats.most_popular_novel.review_count !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Writing Timeline Section */}
        {timeline.length > 0 && (
          <>
            <View style={styles.sectionDivider} />
            <View style={styles.timelineSection}>
              <Text style={styles.sectionTitle}>Writing Journey</Text>
              {timeline.map((item, index) => (
                <TouchableOpacity
                  key={`${item.id}-${index}`}
                  style={styles.timelineItem}
                  onPress={() => navigation.navigate('LibraryBookDetail', { novelId: item.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>{item.title}</Text>
                    <Text style={styles.timelineMeta}>
                      {item.chapter_count} chapters · {item.word_count.toLocaleString()} words
                    </Text>
                    {item.created_at && (
                      <Text style={styles.timelineDate}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Novels Section */}
        {novels.length > 0 && (
          <>
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionTitle}>
              Novels ({novels.length})
            </Text>
            {novels.map((novel) => (
              <TouchableOpacity
                key={novel.id}
                style={styles.novelItem}
                onPress={() => navigation.navigate('LibraryBookDetail', { novelId: novel.id })}
                activeOpacity={0.7}
              >
                {novel.cover_image_url ? (
                  <Image source={{ uri: `http://localhost:8000${novel.cover_image_url}` }} style={styles.novelCoverSmall} resizeMode="cover" />
                ) : (
                  <View style={styles.novelCoverSmall}>
                    <Text style={styles.novelCoverText}>{novel.title.charAt(0)}</Text>
                  </View>
                )}
                <View style={styles.novelInfo}>
                  <Text style={styles.novelTitle} numberOfLines={1}>{novel.title}</Text>
                  {novel.genre && (
                    <Text style={styles.novelMeta}>{novel.genre} · {novel.total_word_count} words</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'posts' && styles.tabItemActive]}
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>Posts</Text>
          </TouchableOpacity>
          {novels.length > 0 && (
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'novels' && styles.tabItemActive]}
              onPress={() => setActiveTab('novels')}
            >
              <Text style={[styles.tabText, activeTab === 'novels' && styles.tabTextActive]}>Novels</Text>
            </TouchableOpacity>
          )}
          {isMe && bookmarks.length > 0 && (
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'bookmarks' && styles.tabItemActive]}
              onPress={() => setActiveTab('bookmarks')}
            >
              <Text style={[styles.tabText, activeTab === 'bookmarks' && styles.tabTextActive]}>
                Bookmarks ({bookmarks.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Content */}
        {activeTab === 'posts' && posts.map((post) => (
          <TouchableOpacity
            key={post.id}
            style={styles.postItem}
            onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
            activeOpacity={0.7}
          >
            <Text style={styles.postContent} numberOfLines={3}>
              {post.content}
            </Text>
            <View style={styles.postMeta}>
              <Text style={styles.postMetaText}>
                ❤️ {post.like_count} · 💬 {post.comment_count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {activeTab === 'novels' && novels.map((novel) => (
          <TouchableOpacity
            key={novel.id}
            style={styles.novelItem}
            onPress={() => navigation.navigate('LibraryBookDetail', { novelId: novel.id })}
            activeOpacity={0.7}
          >
            {novel.cover_image_url ? (
              <Image source={{ uri: `http://localhost:8000${novel.cover_image_url}` }} style={styles.novelCoverSmall} resizeMode="cover" />
            ) : (
              <View style={styles.novelCoverSmall}>
                <Text style={styles.novelCoverText}>{novel.title.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.novelInfo}>
              <Text style={styles.novelTitle} numberOfLines={1}>{novel.title}</Text>
              {novel.genre && (
                <Text style={styles.novelMeta}>{novel.genre} · {novel.total_word_count} words</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}

        {activeTab === 'bookmarks' && bookmarks.map((bm) => (
          <TouchableOpacity
            key={bm.id}
            style={styles.postItem}
            onPress={() => bm.post_id && navigation.navigate('PostDetail', { postId: bm.post_id })}
            activeOpacity={0.7}
          >
            <Text style={styles.postContent} numberOfLines={3}>
              {bm.post?.content || 'Bookmark'}
            </Text>
            <View style={styles.postMeta}>
              <Text style={styles.postMetaText}>
                Saved {new Date(bm.created_at).toLocaleDateString()}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileHeader: {
    padding: XSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: XBorderRadius.full,
    backgroundColor: XColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: XSpacing.md,
  },
  largeAvatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  displayName: {
    ...XTypography.headlineMedium,
    color: XColors.textPrimary,
    fontWeight: '700',
    marginBottom: XSpacing.xs,
  },
  username: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
    marginBottom: XSpacing.md,
  },
  bio: {
    ...XTypography.bodyMedium,
    color: XColors.textPrimary,
    lineHeight: XTypography.bodyMedium.lineHeight,
    marginBottom: XSpacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: XSpacing.lg,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: XColors.border,
  },
  statNumber: {
    ...XTypography.titleLarge,
    color: XColors.textPrimary,
    fontWeight: '700',
    marginBottom: XSpacing.xs,
  },
  statLabel: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },
  followButton: {
    backgroundColor: XColors.textPrimary,
    paddingVertical: XSpacing.md,
    borderRadius: XBorderRadius.full,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: XColors.background,
    borderWidth: 1,
    borderColor: XColors.border,
  },
  followButtonText: {
    ...XTypography.bodyMedium,
    color: '#ffffff',
    fontWeight: '700',
  },
  followingButtonText: {
    color: XColors.textPrimary,
  },
  messageButton: {
    backgroundColor: XColors.surface,
    paddingVertical: XSpacing.sm,
    paddingHorizontal: XSpacing.xl,
    borderRadius: XBorderRadius.full,
    marginTop: XSpacing.sm,
    borderWidth: 1,
    borderColor: XColors.primary,
  },
  messageButtonText: {
    ...XTypography.bodyMedium,
    color: XColors.primary,
    fontWeight: '700',
  },
  editButton: {
    backgroundColor: XColors.primary,
    paddingVertical: XSpacing.sm,
    paddingHorizontal: XSpacing.xl,
    borderRadius: XBorderRadius.full,
    marginTop: XSpacing.sm,
  },
  editButtonText: {
    ...XTypography.bodyMedium,
    color: '#ffffff',
    fontWeight: '700',
  },
  editForm: {
    marginTop: XSpacing.md,
    width: '100%',
  },
  editInput: {
    marginBottom: XSpacing.sm,
    backgroundColor: XColors.background,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: XSpacing.md,
  },
  editCancelBtn: {
    paddingHorizontal: XSpacing.lg,
    paddingVertical: XSpacing.sm,
  },
  editCancelText: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
  },
  editSaveBtn: {
    backgroundColor: XColors.primary,
    paddingHorizontal: XSpacing.lg,
    paddingVertical: XSpacing.sm,
    borderRadius: XBorderRadius.full,
  },
  editSaveText: {
    ...XTypography.bodyMedium,
    color: '#ffffff',
    fontWeight: '700',
  },
  sectionDivider: {
    height: 8,
    backgroundColor: XColors.surface,
  },
  sectionTitle: {
    ...XTypography.titleLarge,
    color: XColors.textPrimary,
    fontWeight: '700',
    padding: XSpacing.lg,
    paddingBottom: XSpacing.sm,
  },
  postItem: {
    padding: XSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
  },
  postContent: {
    ...XTypography.bodyMedium,
    color: XColors.textPrimary,
    lineHeight: XTypography.bodyMedium.lineHeight,
    marginBottom: XSpacing.sm,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postMetaText: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },
  novelItem: {
    flexDirection: 'row',
    padding: XSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
    alignItems: 'center',
  },
  novelCoverSmall: {
    width: 48,
    height: 64,
    backgroundColor: XColors.primary,
    borderRadius: XBorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: XSpacing.md,
  },
  novelCoverText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  novelInfo: {
    flex: 1,
  },
  novelTitle: {
    ...XTypography.bodyMedium,
    color: XColors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  novelMeta: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
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
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: XColors.primary,
    fontWeight: '700',
  },
  // Writer Profile Styles
  writerStatsSection: {
    padding: XSpacing.lg,
    backgroundColor: XColors.surface,
  },
  writerStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: XSpacing.md,
  },
  writerStatCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: XColors.background,
    padding: XSpacing.md,
    borderRadius: XBorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: XColors.border,
  },
  writerStatIcon: {
    fontSize: 24,
    marginBottom: XSpacing.xs,
  },
  writerStatValue: {
    ...XTypography.headlineSmall,
    color: XColors.primary,
    fontWeight: '700',
    marginBottom: XSpacing.xs,
  },
  writerStatLabel: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },
  writingSince: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    marginTop: XSpacing.md,
    textAlign: 'center',
  },
  popularNovelCard: {
    marginTop: XSpacing.md,
    padding: XSpacing.md,
    backgroundColor: `${XColors.primary}10`,
    borderRadius: XBorderRadius.lg,
    borderWidth: 1,
    borderColor: XColors.primary,
  },
  popularNovelLabel: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    marginBottom: XSpacing.xs,
  },
  popularNovelTitle: {
    ...XTypography.titleMedium,
    color: XColors.primary,
    fontWeight: '600',
    marginBottom: XSpacing.xs,
  },
  popularNovelStats: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },
  timelineSection: {
    padding: XSpacing.lg,
    backgroundColor: XColors.surface,
  },
  timelineItem: {
    flexDirection: 'row',
    paddingVertical: XSpacing.md,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: XColors.primary,
    marginTop: 4,
    marginRight: XSpacing.md,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    ...XTypography.bodyLarge,
    color: XColors.textPrimary,
    fontWeight: '600',
    marginBottom: XSpacing.xs,
  },
  timelineMeta: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    marginBottom: XSpacing.xs,
  },
  timelineDate: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    fontStyle: 'italic',
  },
});
