import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image, TextInput, Modal, Share, ScrollView } from 'react-native';
import { Text, Avatar, FAB, ActivityIndicator, IconButton } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { postsApi, Post } from '../api/posts';
import { commentsApi, Comment } from '../api/comments';
import { likesApi } from '../api/likes';
import { bookmarksApi } from '../api/bookmarks';
import { groupsApi, Group } from '../api/groups';
import { authApi, UserProfile } from '../api/auth';
import { XColors } from '../theme/xStyle';
import { getSuggestions, TagDef, matchTagPrefix, TAGS as ALL_TAGS } from '../utils/tags';
import { useI18n } from '../i18n/I18nContext';

type IdeasScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: IdeasScreenNavigationProp;
}

type FeedTab = 'public' | 'following' | 'trending';

export default function IdeasScreen({ navigation }: Props) {
  const { t, language } = useI18n();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FeedTab>('public');

  // Dynamic tab labels based on language
  const TAB_CONFIG: { key: FeedTab; label: string }[] = [
    { key: 'following', label: t('feedFollowing') },
    { key: 'public', label: t('feedPublic') },
    { key: 'trending', label: t('feedTrending') },
  ];

  const loadFeed = useCallback(async (tab: FeedTab = activeTab) => {
    try {
      let res;
      if (tab === 'following') {
        res = await postsApi.getFeed().catch(() => postsApi.getAll());
      } else if (tab === 'trending') {
        res = await postsApi.getTrending();
      } else {
        res = await postsApi.getAll();
      }
      setPosts(res.data);
    } catch (error) {
      console.error('Failed to load feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    loadFeed(activeTab);
  }, [activeTab, loadFeed]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFeed(activeTab);
  };

  const handleTabChange = (tab: FeedTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
  };

  // ── Helpers passed to PostItem ──
  const handlePostUpdate = (updatedPost: Post) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Weibo-style Tab Bar */}
      <View style={styles.tabBar}>
        {TAB_CONFIG.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => handleTabChange(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {isActive && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>
            {activeTab === 'following' ? '👥' : activeTab === 'trending' ? '🔥' : '💡'}
          </Text>
          <Text style={styles.emptyTitle}>
            {activeTab === 'following'
              ? 'No posts yet'
              : activeTab === 'trending'
              ? 'No trending posts'
              : 'No posts yet'}
          </Text>
          <Text style={styles.hint}>
            {activeTab === 'following'
              ? 'Follow users to see their posts here.'
              : activeTab === 'trending'
              ? 'No trending posts yet.'
              : 'Be the first to share your ideas!'}
          </Text>
          {activeTab === 'following' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('SearchUsers')}
            >
              <Text style={styles.actionButtonText}>Find People to Follow</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={({ item }) => (
            <PostItem
              post={item}
              navigation={navigation}
              onPostUpdate={handlePostUpdate}
            />
          )}
          keyExtractor={(item) => item.id.toString()}
          ItemSeparatorComponent={() => <View style={styles.postSeparator} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreatePost')}
        label="New Post"
      />
    </View>
  );
}

// ─────────────────────────────────────────────
// PostItem — isolated per-post state
// ─────────────────────────────────────────────

function PostItem({
  post,
  navigation,
  onPostUpdate,
}: {
  post: Post;
  navigation: IdeasScreenNavigationProp;
  onPostUpdate: (p: Post) => void;
}) {
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentTag, setCommentTag] = useState<string | null>(null);
  const [commentSuggestions, setCommentSuggestions] = useState<TagDef[]>([]);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [liked, setLiked] = useState(post.is_liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [likeLoading, setLikeLoading] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  // Repost / Forward modal
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [forwardLoading, setForwardLoading] = useState(false);
  const [repostLoading, setRepostLoading] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const handleLike = async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    try {
      if (wasLiked) {
        await likesApi.unlike(post.id);
      } else {
        await likesApi.like(post.id);
      }
    } catch (e) {
      setLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
    } finally {
      setLikeLoading(false);
    }
  };

  const handleBookmark = async () => {
    const wasBookmarked = bookmarked;
    setBookmarked(!wasBookmarked);
    try {
      if (wasBookmarked) {
        await bookmarksApi.unbookmark(post.id);
      } else {
        await bookmarksApi.bookmark(post.id);
      }
    } catch (e) {
      setBookmarked(wasBookmarked);
    }
  };

  const handleCommentTextChange = (text: string) => {
    setCommentText(text);
    if (text.startsWith('/')) {
      const sug = getSuggestions(text);
      setCommentSuggestions(sug);
    } else {
      setCommentSuggestions([]);
      setCommentTag(null);
    }
  };

  const handleSelectCommentTag = (tag: TagDef) => {
    setCommentText(tag.prefix + ' ');
    setCommentTag(tag.slug);
    setCommentSuggestions([]);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || commentSubmitting) return;
    setCommentSubmitting(true);
    try {
      const matched = matchTagPrefix(commentText.trim());
      const cleanContent = matched ? commentText.trim().slice(matched.prefix.length).trim() : commentText.trim();
      const tagSlug = matched?.slug || commentTag || undefined;
      await commentsApi.create(post.id, {
        content: cleanContent,
        tag: tagSlug,
      });
      setCommentText('');
      setCommentTag(null);
      setShowCommentInput(false);
      onPostUpdate({ ...post, comment_count: (post.comment_count || 0) + 1 });
    } catch (e) {
      console.error('Comment failed:', e);
    } finally {
      setCommentSubmitting(false);
    }
  };

  // ── Repost ──
  const handleRepost = async () => {
    if (repostLoading) return;
    setRepostLoading(true);
    try {
      await postsApi.repost(post.id);
      setShowRepostModal(false);
      onPostUpdate({ ...post, repost_count: (post.repost_count || 0) + 1 });
    } catch (e) {
      console.error('Repost failed:', e);
    } finally {
      setRepostLoading(false);
    }
  };

  // ── Forward ──
  const openForwardModal = async () => {
    setShowRepostModal(false);
    setShowForwardModal(true);
    try {
      const res = await groupsApi.getAll();
      setMyGroups(res.data);
    } catch (e) {
      console.error('Failed to load groups:', e);
    }
  };

  const handleForwardToGroup = async (groupId: number) => {
    if (forwardLoading) return;
    setForwardLoading(true);
    try {
      await postsApi.forwardToGroup(post.id, groupId);
      setShowForwardModal(false);
      onPostUpdate({ ...post, repost_count: (post.repost_count || 0) + 1 });
    } catch (e) {
      console.error('Forward failed:', e);
    } finally {
      setForwardLoading(false);
    }
  };

  // ── Share ──
  const handleShare = async () => {
    try {
      await Share.share({
        message: post.content,
        title: `Post by ${post.author?.display_name || post.author?.username}`,
      });
    } catch (e) {
      console.error('Share failed:', e);
    }
  };

  const allowComments = post.allow_comments !== false;
  const allowRepost = post.allow_repost !== false;
  const allowShare = post.allow_share !== false;
  const isRepost = !!post.repost_of;

  return (
    <View style={styles.postContainer}>
      {/* Avatar */}
      <TouchableOpacity
        onPress={() => {
          if (post.author) navigation.navigate('UserProfile', { userId: post.author.id });
        }}
      >
        <Avatar.Text
          size={48}
          label={(post.author?.display_name || post.author?.username || 'U').charAt(0).toUpperCase()}
          style={styles.avatar}
        />
      </TouchableOpacity>

      {/* Post Content */}
      <View style={styles.postContent}>
        {/* Repost badge */}
        {isRepost && (
          <View style={styles.repostBadge}>
            <Text style={styles.repostBadgeIcon}>🔄</Text>
            <Text style={styles.repostBadgeText}>Reposted</Text>
          </View>
        )}

        {/* Trending badge */}
        {(post.like_count || 0) + (post.comment_count || 0) + (post.repost_count || 0) > 10 && (
          <View style={styles.trendingBadge}>
            <Text>🔥</Text>
            <Text style={styles.trendingText}>Trending</Text>
          </View>
        )}

        {/* Header: Name, @username, Time + ⋯ */}
        <View style={styles.postHeader}>
          <View style={styles.postHeaderLeft}>
            <TouchableOpacity
              onPress={() => {
                if (post.author) navigation.navigate('UserProfile', { userId: post.author.id });
              }}
            >
              <Text style={styles.authorName} numberOfLines={1}>
                {post.author?.display_name || post.author?.username || 'Unknown'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.authorHandle} numberOfLines={1}>
              @{post.author?.username || 'unknown'}
            </Text>
            <Text style={styles.headerDot}>·</Text>
            <Text style={styles.timestamp}>{formatTimestamp(post.created_at)}</Text>
          </View>
          <TouchableOpacity style={styles.moreBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.moreBtnText}>⋯</Text>
          </TouchableOpacity>
        </View>

        {/* Original post embed (if repost) */}
        {post.original_post && (
          <View style={styles.originalPostEmbed}>
            <Text style={styles.originalPostAuthor}>
              {post.original_post.author?.display_name || post.original_post.author?.username || 'Unknown'}
            </Text>
            <Text style={styles.originalPostContent} numberOfLines={3}>
              {post.original_post.content}
            </Text>
          </View>
        )}

        {/* Text + Image → tap to navigate to detail */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
        >
          <Text style={styles.postText} numberOfLines={10}>
            {post.content}
          </Text>
          {/* Multi-image display */}
          {post.image_urls && post.image_urls.length > 0 ? (
            <View style={styles.postImageGrid}>
              {post.image_urls.slice(0, 4).map((url: string, idx: number) => (
                <Image
                  key={idx}
                  source={{ uri: url.startsWith('http') ? url : `http://localhost:8000${url}` }}
                  style={[
                    styles.postGridImage,
                    post.image_urls!.length === 1 && styles.postGridImageSingle,
                    post.image_urls!.length === 2 && styles.postGridImageDouble,
                  ]}
                  resizeMode="cover"
                />
              ))}
              {post.image_urls.length > 4 && (
                <View style={[styles.postGridImage, styles.postGridImageOverlay]}>
                  <Text style={styles.postGridImageOverlayText}>+{post.image_urls.length - 4}</Text>
                </View>
              )}
            </View>
          ) : post.image_url ? (
            <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />
          ) : null}
        </TouchableOpacity>

        {/* Action Buttons — X-style full-width bar */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              if (allowComments) setShowCommentInput(!showCommentInput);
            }}
            disabled={!allowComments}
            activeOpacity={0.5}
          >
            <IconButton
              icon="comment-outline"
              size={18}
              iconColor={allowComments ? '#536471' : '#c4c4c4'}
              style={styles.actionIcon}
            />
            <Text style={[styles.actionCount, !allowComments && styles.actionCountDisabled]}>
              {post.comment_count || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              if (allowRepost) setShowRepostModal(true);
            }}
            disabled={!allowRepost}
            activeOpacity={0.5}
          >
            <IconButton
              icon="repeat"
              size={18}
              iconColor={allowRepost ? '#536471' : '#c4c4c4'}
              style={styles.actionIcon}
            />
            <Text style={[styles.actionCount, !allowRepost && styles.actionCountDisabled]}>
              {post.repost_count || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleLike}
            activeOpacity={0.6}
          >
            <IconButton
              icon={liked ? 'heart' : 'heart-outline'}
              size={18}
              iconColor={liked ? '#e0245e' : '#536471'}
              style={styles.actionIcon}
            />
            <Text style={[styles.actionCount, liked && styles.actionCountActive]}>
              {likeCount > 0 ? likeCount : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { marginRight: 0 }]}
            onPress={handleBookmark}
            activeOpacity={0.6}
          >
            <IconButton
              icon={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={18}
              iconColor={bookmarked ? '#f59e0b' : '#536471'}
              style={styles.actionIcon}
            />
          </TouchableOpacity>
        </View>


        {/* Inline Comment Input (X-style: composer above replies) */}
        {showCommentInput && (
          <View style={styles.commentInputContainer}>

            {/* X-style divider */}
            <View style={styles.xReplyDivider} />

            {/* Subtitle */}
            <Text style={styles.xReplyLabel}>Replying to{' '}
              <Text style={styles.xReplyTo}>
                @{post.author?.username || 'unknown'}
              </Text>
            </Text>
            {/* Tag suggestion chips */}
            {commentSuggestions.length > 0 && (
              <ScrollView horizontal style={styles.tagSuggestionRow} showsHorizontalScrollIndicator={false}>
                {commentSuggestions.map((tag) => (
                  <TouchableOpacity
                    key={tag.slug}
                    style={[styles.tagChip, { backgroundColor: tag.color + '20' }]}
                    onPress={() => handleSelectCommentTag(tag)}
                  >
                    <Text style={styles.tagChipText}>{tag.emoji} {tag.prefix}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            {commentTag && (
              <View style={styles.activeCommentTag}>
                <Text style={styles.activeCommentTagText}>{ALL_TAGS[commentTag]?.emoji} {commentTag}</Text>
              </View>
            )}
            <TextInput
              style={styles.commentInput}
              value={commentText}
              onChangeText={handleCommentTextChange}
              placeholder="Write a comment... (use / for tags)"
              placeholderTextColor="#8899a6"
              multiline
              autoFocus
            />
            <View style={styles.commentActions}>
              <TouchableOpacity
                style={styles.cancelCommentBtn}
                onPress={() => {
                  setShowCommentInput(false);
                  setCommentText('');
                  setCommentTag(null);
                  setCommentSuggestions([]);
                }}
              >
                <Text style={styles.cancelCommentText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitCommentBtn,
                  (!commentText.trim() || commentSubmitting) && styles.submitDisabled,
                ]}
                onPress={handleSubmitComment}
                disabled={!commentText.trim() || commentSubmitting}
              >
                <Text style={styles.submitCommentText}>
                  {commentSubmitting ? 'Posting...' : 'Reply'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Existing replies (X-style) */}
            <ActivitySection
              post={post}
              comments={comments}
              setComments={setComments}
              loadingActivity={loadingActivity}
              setLoadingActivity={setLoadingActivity}
              navigation={navigation}
              formatTimestamp={formatTimestamp}
            />
          </View>
        )}
      </View>

      {/* ── Repost Modal ── */}
      <Modal visible={showRepostModal} transparent animationType="fade" onRequestClose={() => setShowRepostModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowRepostModal(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Repost</Text>
            <TouchableOpacity style={styles.modalOption} onPress={handleRepost} disabled={repostLoading}>
              <Text style={styles.modalOptionIcon}>🔄</Text>
              <Text style={styles.modalOptionText}>
                {repostLoading ? 'Reposting...' : 'Repost to Feed'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={openForwardModal}>
              <Text style={styles.modalOptionIcon}>📨</Text>
              <Text style={styles.modalOptionText}>Forward to Group</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowRepostModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Forward to Group Modal ── */}
      <Modal visible={showForwardModal} transparent animationType="fade" onRequestClose={() => setShowForwardModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowForwardModal(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Forward to Group</Text>
            {myGroups.length === 0 ? (
              <Text style={styles.modalEmpty}>No groups available. Create one first!</Text>
            ) : (
              <ScrollView style={styles.groupList}>
                {myGroups.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    style={styles.groupOption}
                    onPress={() => handleForwardToGroup(g.id)}
                    disabled={forwardLoading}
                  >
                    <Text style={styles.groupOptionIcon}>👥</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.groupOptionName}>{g.name}</Text>
                      <Text style={styles.groupOptionMembers}>
                        {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowForwardModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}


// ─────────────────────────────────────────────
// ActivitySection — comments, reposters, likers
// ─────────────────────────────────────────────

function ActivitySection({
  post,
  comments,
  setComments,
  loadingActivity,
  setLoadingActivity,
  navigation,
  formatTimestamp,
}: {
  post: Post;
  comments: Comment[];
  setComments: (c: Comment[]) => void;
  loadingActivity: boolean;
  setLoadingActivity: (v: boolean) => void;
  navigation: IdeasScreenNavigationProp;
  formatTimestamp: (d: string) => string;
}) {
  useEffect(() => {
    loadComments();
  }, []);

  const loadComments = async () => {
    setLoadingActivity(true);
    try {
      const res = await commentsApi.getByPost(post.id);
      setComments(res.data);
    } catch (e) {
      console.error('Failed to load comments:', e);
    } finally {
      setLoadingActivity(false);
    }
  };

  if (loadingActivity) {
    return (
      <View style={styles.activityLoader}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (comments.length === 0) {
    return (
      <View style={styles.noComments}>
        <Text style={styles.noCommentsText}>No replies yet. Be the first!</Text>
      </View>
    );
  }

  return (
    <View style={styles.xCommentsList}>
      {comments.map((comment) => (
        <TouchableOpacity
          key={comment.id}
          style={styles.xCommentItem}
          activeOpacity={0.7}
          onPress={() => {
            if (comment.author) navigation.navigate('UserProfile', { userId: comment.author.id });
          }}
        >
          <Avatar.Text
            size={28}
            label={(comment.author?.display_name || comment.author?.username || 'U').charAt(0).toUpperCase()}
            style={styles.xCommentAvatar}
          />
          <View style={styles.xCommentBody}>
            <View style={styles.xCommentHeader}>
              <Text style={styles.xCommentAuthor} numberOfLines={1}>
                {comment.author?.display_name || comment.author?.username || 'Unknown'}
              </Text>
              <Text style={styles.xCommentDot}>·</Text>
              <Text style={styles.xCommentTime}>{formatTimestamp(comment.created_at)}</Text>
            </View>
            <Text style={styles.xCommentContent}>{comment.content}</Text>
            {comment.tag && (
              <View style={[styles.xCommentTag, { backgroundColor: (ALL_TAGS[comment.tag]?.color || '#1d9bf0') + '15' }]}>
                <Text style={[styles.xCommentTagText, { color: ALL_TAGS[comment.tag]?.color || '#1d9bf0' }]}>
                  {ALL_TAGS[comment.tag]?.emoji || ''} {comment.tag}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  // Weibo-style Tab Bar — polished
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eff3f4',
    backgroundColor: '#ffffff',
    paddingTop: 10,
    paddingBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
    zIndex: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 15,
    color: '#8899a6',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: '#0f1419',
    fontWeight: '800',
    fontSize: 16,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 28,
    height: 4,
    backgroundColor: '#1d9bf0',
    borderRadius: 2,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f1419',
    marginBottom: 8,
    textAlign: 'center',
  },
  hint: {
    marginTop: 4,
    textAlign: 'center',
    color: '#8899a6',
    marginBottom: 20,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 280,
  },
  actionButton: {
    marginTop: 4,
    backgroundColor: '#1d9bf0',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#1d9bf0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  // Hairline between posts (X-style)
  postSeparator: {
    height: 1,
    backgroundColor: '#eff3f4',
  },
  // X-Style Post Card — polished
  postContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
  },
  avatar: {
    backgroundColor: XColors.primary,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(29, 155, 240, 0.15)',
  },
  avatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(29, 155, 240, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  postContent: {
    flex: 1,
  },
  // Header: Name @handle · time + ⋯
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f1419',
    marginRight: 4,
    maxWidth: '40%',
  },
  authorHandle: {
    fontSize: 15,
    color: '#536471',
    marginRight: 4,
    maxWidth: '35%',
  },
  headerDot: {
    fontSize: 15,
    color: '#536471',
    marginRight: 4,
  },
  timestamp: {
    fontSize: 15,
    color: '#536471',
  },
  moreBtn: {
    paddingLeft: 8,
  },
  moreBtnText: {
    fontSize: 18,
    color: '#536471',
    fontWeight: '700',
    letterSpacing: 1,
  },
  // Post body — polished
  postText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#0f1419',
    marginBottom: 12,
    marginTop: 4,
    letterSpacing: 0.1,
  },
  postImage: {
    width: '100%',
    height: 280,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: '#f7f9f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  // Multi-image grid
  postImageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12,
  },
  postGridImage: {
    width: '48%',
    height: 140,
    borderRadius: 12,
    backgroundColor: '#f7f9f9',
  },
  postGridImageSingle: {
    width: '100%',
    height: 240,
  },
  postGridImageDouble: {
    width: '48%',
  },
  postGridImageOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postGridImageOverlayText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  // Action bar — polished with interactive feedback
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingRight: 32,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  actionIcon: {
    margin: 0,
    padding: 0,
  },
  actionCount: {
    fontSize: 13,
    color: '#536471',
    marginLeft: 4,
    fontWeight: '500',
  },
  actionCountActive: {
    color: '#e0245e',
    fontWeight: '700',
  },
  actionCountDisabled: {
    color: '#c4c4c4',
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  trendingText: {
    fontSize: 13,
    color: '#ff7a00',
    fontWeight: '700',
    marginLeft: 4,
  },
  fab: {
    position: 'absolute',
    margin: 20,
    right: 0,
    bottom: 0,
    backgroundColor: '#1d9bf0',
    shadowColor: '#1d9bf0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  // Inline comment input — polished
  commentInputContainer: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#eff3f4',
    paddingTop: 10,
    backgroundColor: '#fafbfc',
    borderRadius: 12,
    padding: 12,
  },
  commentInput: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f1419',
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#e8eaed',
  },
  commentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  cancelCommentBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cancelCommentText: {
    fontSize: 13,
    color: '#536471',
    fontWeight: '600',
  },
  submitCommentBtn: {
    backgroundColor: '#1d9bf0',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitCommentText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
  },
  // Repost badge — polished
  repostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: '#f7f9f9',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  repostBadgeIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  repostBadgeText: {
    fontSize: 12,
    color: '#536471',
    fontWeight: '700',
  },
  // Original post embed — polished card style
  originalPostEmbed: {
    backgroundColor: '#f7f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#eff3f4',
  },
  originalPostAuthor: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f1419',
    marginBottom: 4,
  },
  originalPostContent: {
    fontSize: 14,
    color: '#536471',
    lineHeight: 20,
  },

  // Tag suggestions in comment
  tagSuggestionRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    marginRight: 8,
  },
  tagChipText: {
    fontSize: 12,
    color: '#0f1419',
    fontWeight: '600',
  },
  activeCommentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  activeCommentTagText: {
    fontSize: 12,
    color: '#1d9bf0',
    fontWeight: '600',
  },
  // Modal styles — polished
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f1419',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  modalOptionIcon: {
    fontSize: 22,
    marginRight: 16,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#0f1419',
    fontWeight: '600',
  },
  modalCancel: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#f7f9f9',
    borderRadius: 16,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#536471',
    fontWeight: '700',
  },
  modalEmpty: {
    fontSize: 14,
    color: '#8899a6',
    textAlign: 'center',
    paddingVertical: 24,
    fontWeight: '500',
  },
  // Group list in forward modal
  groupList: {
    maxHeight: 300,
  },
  groupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eff3f4',
  },
  groupOptionIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  groupOptionName: {
    fontSize: 15,
    color: '#0f1419',
    fontWeight: '600',
  },

  // X-style reply divider + label
  xReplyDivider: {
    height: 1,
    backgroundColor: '#e8eaed',
    marginBottom: 10,
  },
  xReplyLabel: {
    fontSize: 13,
    color: '#8899a6',
    marginBottom: 12,
    fontWeight: '500',
  },
  xReplyTo: {
    color: '#1d9bf0',
    fontWeight: '700',
  },
  // X-style comments list — polished
  xCommentsList: {
    borderTopWidth: 1,
    borderTopColor: '#f0f2f5',
    marginTop: 12,
    paddingTop: 10,
  },
  xCommentItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  xCommentAvatar: {
    backgroundColor: '#1d9bf0',
    marginRight: 10,
    marginTop: 2,
  },
  xCommentBody: {
    flex: 1,
    backgroundColor: '#f7f9f9',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  xCommentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    flexWrap: 'wrap',
  },
  xCommentAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f1419',
    maxWidth: '55%',
  },
  xCommentDot: {
    fontSize: 13,
    color: '#8899a6',
    marginHorizontal: 4,
  },
  xCommentTime: {
    fontSize: 12,
    color: '#8899a6',
    fontWeight: '500',
  },
  xCommentContent: {
    fontSize: 14,
    color: '#0f1419',
    lineHeight: 20,
  },
  xCommentTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 6,
  },
  xCommentTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Loading / empty
  activityLoader: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  noComments: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noCommentsText: {
    fontSize: 14,
    color: '#8899a6',
    fontWeight: '500',
  },
  // ... keep existing
  groupOptionMembers: {
    fontSize: 13,
    color: '#536471',
    marginTop: 2,
  },
});
