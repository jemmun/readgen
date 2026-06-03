import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Text, ActivityIndicator, TextInput } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { postsApi, Post } from '../api/posts';
import { commentsApi, Comment } from '../api/comments';
import { likesApi } from '../api/likes';
import { authApi, UserProfile } from '../api/auth';
import { reportsApi } from '../api/reports';
import { XColors, XTypography, XSpacing, XBorderRadius, XAvatarSizes } from '../theme/xStyle';
import MentionAutocomplete from '../components/MentionAutocomplete';

type PostDetailScreenProps = StackScreenProps<RootStackParamList, 'PostDetail'>;

// Recursive comment component for nested replies
function CommentItem({
  comment,
  comments,
  depth = 0,
  isAuthor,
  adoptingId,
  handleAdoptComment,
  setReplyToId,
  formatTimestamp,
}: {
  comment: Comment;
  comments: Comment[];
  depth?: number;
  isAuthor: boolean;
  adoptingId: number | null;
  handleAdoptComment: (id: number) => void;
  setReplyToId: (id: number | null) => void;
  formatTimestamp: (date: string) => string;
}) {
  const replies = comments.filter(c => c.parent_id === comment.id);
  const maxDepth = 3; // Limit nesting depth for UI clarity
  const indent = Math.min(depth, maxDepth) * 16;

  return (
    <>
      <View style={[styles.commentItem, depth > 0 && { marginLeft: indent, marginTop: XSpacing.sm }]}>
        {depth > 0 && <View style={styles.replyLine} />}
        <View style={styles.commentHeader}>
          <View style={styles.commentAvatar}>
            <Text style={styles.commentAvatarText}>
              {(comment.author?.display_name || comment.author?.username || 'U')[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.commentInfo}>
            <View style={styles.commentAuthorRow}>
              <Text style={styles.commentAuthor}>
                {comment.author?.display_name || comment.author?.username || 'Unknown'}
              </Text>
              <Text style={styles.commentTimestamp}>
                {formatTimestamp(comment.created_at)}
              </Text>
            </View>
            {comment.adopted && (
              <View style={styles.adoptedBadge}>
                <Text style={styles.adoptedBadgeText}>✓ Adopted</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.commentContent}>{comment.content}</Text>
        <TouchableOpacity onPress={() => setReplyToId(comment.id)} style={styles.replyBtn}>
          <Text style={styles.replyBtnText}>Reply</Text>
        </TouchableOpacity>
        {isAuthor && !comment.adopted && depth === 0 && (
          <TouchableOpacity
            style={styles.adoptButton}
            onPress={() => handleAdoptComment(comment.id)}
            disabled={adoptingId === comment.id}
          >
            {adoptingId === comment.id ? (
              <ActivityIndicator size="small" color={XColors.primary} />
            ) : (
              <Text style={styles.adoptButtonText}>Adopt as Chapter</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
      {/* Render nested replies */}
      {replies.map(reply => (
        <CommentItem
          key={reply.id}
          comment={reply}
          comments={comments}
          depth={depth + 1}
          isAuthor={isAuthor}
          adoptingId={adoptingId}
          handleAdoptComment={handleAdoptComment}
          setReplyToId={setReplyToId}
          formatTimestamp={formatTimestamp}
        />
      ))}
    </>
  );
}

export default function PostDetailScreen({ navigation, route }: PostDetailScreenProps) {
  const { postId } = route.params;
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [adoptingId, setAdoptingId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  
  // Mention autocomplete state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });

  const formatTimestamp = (dateString: string): string => {
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

  const loadData = useCallback(async () => {
    try {
      const [postRes, commentsRes, meRes] = await Promise.all([
        postsApi.getById(postId),
        commentsApi.getByPost(postId),
        authApi.me().catch(() => null),
      ]);
      setPost(postRes.data);
      setComments(commentsRes.data);
      if (meRes) setCurrentUser(meRes.data);
    } catch (error) {
      console.error('Failed to load post:', error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLikeToggle = async () => {
    if (!post || !currentUser) return;
    try {
      if (post.is_liked_by_me) {
        await likesApi.unlike(post.id);
      } else {
        await likesApi.like(post.id);
      }
      const res = await postsApi.getById(postId);
      setPost(res.data);
    } catch (error) {
      console.error('Like toggle failed:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    setSubmitting(true);
    try {
      await commentsApi.create(postId, { content: newComment, parent_id: replyToId || undefined });
      setNewComment('');
      setReplyToId(null);
      setShowMentions(false);
      const res = await commentsApi.getByPost(postId);
      setComments(res.data);
      if (post) {
        const postRes = await postsApi.getById(postId);
        setPost(postRes.data);
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentTextChange = (text: string) => {
    setNewComment(text);
    
    // Check for @mention pattern
    const mentionMatch = text.match(/@([\w]*)$/);
    
    if (mentionMatch) {
      setShowMentions(true);
      setMentionQuery(mentionMatch[1]);
      setMentionPosition({ top: 100, left: 16 });
    } else {
      setShowMentions(false);
      setMentionQuery('');
    }
  };

  const handleMentionSelect = (username: string, displayName: string) => {
    const mentionStartIndex = newComment.lastIndexOf('@');
    
    if (mentionStartIndex !== -1) {
      const beforeMention = newComment.substring(0, mentionStartIndex);
      const newContent = `${beforeMention}@${username} `;
      setNewComment(newContent);
    }
    
    setShowMentions(false);
    setMentionQuery('');
  };

  const handleAdoptComment = async (commentId: number) => {
    setAdoptingId(commentId);
    try {
      await commentsApi.adopt(commentId);
      const res = await commentsApi.getByPost(postId);
      setComments(res.data);
    } catch (error) {
      console.error('Failed to adopt comment:', error);
    } finally {
      setAdoptingId(null);
    }
  };

  const isAuthor = currentUser && post && currentUser.id === post.user_id;

  const handleEdit = () => {
    if (!post) return;
    setEditContent(post.content);
    setEditImageUrl(post.image_url || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!post) return;
    try {
      await postsApi.update(post.id, {
        content: editContent,
        image_url: editImageUrl.trim() || undefined,
      });
      const res = await postsApi.getById(postId);
      setPost(res.data);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update post:', error);
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    try {
      await postsApi.delete(post.id);
      navigation.goBack();
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

  const handleReport = () => {
    if (!post) return;
    Alert.prompt(
      'Report Post',
      'Please provide a reason (optional):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          onPress: async (reason) => {
            try {
              await reportsApi.create({
                target_type: 'post',
                target_id: post.id,
                reason: reason || undefined,
              });
              Alert.alert('Success', 'Post has been reported');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to report');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  if (loading || !post) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          <TouchableOpacity
            onPress={() => post.author && navigation.navigate('UserProfile', { userId: post.author.id })}
            style={styles.avatarContainer}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(post.author?.display_name || post.author?.username || 'U')[0].toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.postContent}>
            <View style={styles.authorRow}>
              <TouchableOpacity
                onPress={() => post.author && navigation.navigate('UserProfile', { userId: post.author.id })}
              >
                <Text style={styles.authorName}>
                  {post.author?.display_name || post.author?.username || 'Unknown'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.timestamp}>
                {formatTimestamp(post.created_at)}
              </Text>
              {isAuthor && !isEditing && (
                <View style={styles.authorActions}>
                  <TouchableOpacity onPress={handleEdit} style={styles.authorActionBtn}>
                    <Text style={styles.authorActionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDelete} style={styles.authorActionBtn}>
                    <Text style={[styles.authorActionText, { color: XColors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!isAuthor && (
                <TouchableOpacity onPress={handleReport} style={styles.reportBtn}>
                  <Text style={styles.reportBtnText}>🚩 Report</Text>
                </TouchableOpacity>
              )}
            </View>
            {isEditing ? (
              <View>
                <TextInput
                  value={editContent}
                  onChangeText={setEditContent}
                  multiline
                  style={styles.editInput}
                  mode="outlined"
                  outlineColor={XColors.border}
                  activeOutlineColor={XColors.primary}
                  textColor={XColors.textPrimary}
                />
                <TextInput
                  value={editImageUrl}
                  onChangeText={setEditImageUrl}
                  placeholder="Image URL (optional)"
                  style={styles.editInput}
                  mode="outlined"
                  outlineColor={XColors.border}
                  activeOutlineColor={XColors.primary}
                  textColor={XColors.textSecondary}
                />
                <View style={styles.editActions}>
                  <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.editCancelBtn}>
                    <Text style={styles.editCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSaveEdit} style={styles.editSaveBtn}>
                    <Text style={styles.editSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.content}>
                  {post.content}
                </Text>
                {post.image_url && (
                  <Image
                    source={{ uri: post.image_url }}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                )}
              </>
            )}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionButton} onPress={handleLikeToggle}>
                <Text style={[styles.actionIcon, post.is_liked_by_me && styles.actionIconActive]}>
                  {post.is_liked_by_me ? '❤️' : '🤍'}
                </Text>
                <Text style={[styles.actionText, post.is_liked_by_me && styles.actionTextActive]}>
                  {post.like_count}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionIcon}>💬</Text>
                <Text style={styles.actionText}>{post.comment_count}</Text>
              </TouchableOpacity>
              {post.novel_id && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('NovelDetail', { novelId: post.novel_id! })}
                >
                  <Text style={styles.actionIcon}>📖</Text>
                  <Text style={styles.actionText}>Read Novel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.sectionDivider} />
        <Text style={styles.sectionTitle}>
          Comments ({comments.length})
        </Text>

        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            comments={comments}
            depth={0}
            isAuthor={isAuthor || false}
            adoptingId={adoptingId}
            handleAdoptComment={handleAdoptComment}
            setReplyToId={setReplyToId}
            formatTimestamp={formatTimestamp}
          />
        )).filter((_, index, self) => {
          // Only render top-level comments (parent_id is null/undefined)
          // Nested replies are rendered recursively by CommentItem
          const comment = comments[index];
          return !comment.parent_id;
        })}

        {currentUser && (
          <View style={styles.commentInputContainer}>
            <TextInput
              label={replyToId ? 'Reply to comment...' : 'Add a comment...'}
              value={newComment}
              onChangeText={handleCommentTextChange}
              style={styles.commentInput}
              mode="outlined"
              outlineColor={XColors.border}
              activeOutlineColor={XColors.primary}
              textColor={XColors.textPrimary}
              multiline
            />
            {replyToId && (
              <TouchableOpacity onPress={() => setReplyToId(null)} style={styles.cancelReplyBtn}>
                <Text style={styles.cancelReplyText}>Cancel reply</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.sendButton, (submitting || !newComment.trim()) && styles.sendButtonDisabled]}
              onPress={handleAddComment}
              disabled={submitting || !newComment.trim()}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
            
            {/* Mention Autocomplete Dropdown */}
            {showMentions && (
              <MentionAutocomplete
                query={mentionQuery}
                onSelect={handleMentionSelect}
                onClose={() => setShowMentions(false)}
                position={mentionPosition}
              />
            )}
          </View>
        )}
      </ScrollView>

      {isAuthor && !post.novel_id && (
        <TouchableOpacity
          style={styles.fab}
          onPress={async () => {
            try {
              const res = await postsApi.generateNovel(post.id);
              navigation.navigate('NovelDetail', { novelId: res.data.id });
            } catch (error) {
              console.error('Failed to generate novel:', error);
            }
          }}
        >
          <Text style={styles.fabIcon}>⚡</Text>
          <Text style={styles.fabText}>Generate Novel</Text>
        </TouchableOpacity>
      )}
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
    paddingBottom: 160,
  },
  postHeader: {
    flexDirection: 'row',
    padding: XSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
  },
  avatarContainer: {
    marginRight: XSpacing.md,
  },
  avatar: {
    width: XAvatarSizes.large,
    height: XAvatarSizes.large,
    borderRadius: XBorderRadius.full,
    backgroundColor: XColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...XTypography.titleLarge,
    color: '#ffffff',
    fontWeight: '700',
  },
  postContent: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: XSpacing.xs,
  },
  authorName: {
    ...XTypography.titleLarge,
    color: XColors.textPrimary,
    fontWeight: '700',
    marginRight: XSpacing.sm,
  },
  timestamp: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },
  content: {
    ...XTypography.bodyLarge,
    color: XColors.textPrimary,
    lineHeight: XTypography.bodyLarge.lineHeight,
    marginBottom: XSpacing.md,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: XBorderRadius.md,
    marginBottom: XSpacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: XSpacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: XSpacing.xl,
  },
  actionIcon: {
    ...XTypography.bodySmall,
    marginRight: XSpacing.xs,
  },
  actionIconActive: {
    color: XColors.error,
  },
  actionText: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },
  actionTextActive: {
    color: XColors.error,
    fontWeight: '600',
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
  commentItem: {
    padding: XSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
    position: 'relative',
  },
  replyLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: XColors.primary + '40',
    borderRadius: 2,
  },
  commentHeader: {
    flexDirection: 'row',
    marginBottom: XSpacing.sm,
  },
  commentAvatar: {
    width: XAvatarSizes.small,
    height: XAvatarSizes.small,
    borderRadius: XBorderRadius.full,
    backgroundColor: XColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: XSpacing.sm,
  },
  commentAvatarText: {
    ...XTypography.bodySmall,
    color: '#ffffff',
    fontWeight: '700',
  },
  commentInfo: {
    flex: 1,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: XSpacing.xs,
  },
  commentAuthor: {
    ...XTypography.bodySmall,
    color: XColors.textPrimary,
    fontWeight: '700',
    marginRight: XSpacing.sm,
  },
  commentTimestamp: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },
  adoptedBadge: {
    backgroundColor: XColors.success,
    paddingHorizontal: XSpacing.sm,
    paddingVertical: 2,
    borderRadius: XBorderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: XSpacing.xs,
  },
  adoptedBadgeText: {
    ...XTypography.bodySmall,
    color: '#ffffff',
    fontWeight: '600',
  },
  commentContent: {
    ...XTypography.bodyMedium,
    color: XColors.textPrimary,
    lineHeight: XTypography.bodyMedium.lineHeight,
    marginLeft: XAvatarSizes.small + XSpacing.sm,
    marginBottom: XSpacing.sm,
  },
  adoptButton: {
    marginTop: XSpacing.sm,
    paddingHorizontal: XSpacing.lg,
    paddingVertical: XSpacing.sm,
    borderRadius: XBorderRadius.full,
    borderWidth: 1,
    borderColor: XColors.primary,
    alignSelf: 'flex-start',
    marginLeft: XAvatarSizes.small + XSpacing.sm,
  },
  adoptButtonText: {
    ...XTypography.bodySmall,
    color: XColors.primary,
    fontWeight: '600',
  },
  replyBtn: {
    marginTop: XSpacing.xs,
    alignSelf: 'flex-start',
  },
  replyBtnText: {
    ...XTypography.bodySmall,
    color: XColors.primary,
    fontWeight: '600',
  },
  cancelReplyBtn: {
    paddingVertical: XSpacing.xs,
  },
  cancelReplyText: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },
  authorActions: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  authorActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  authorActionText: {
    ...XTypography.bodySmall,
    color: XColors.primary,
    fontWeight: '600',
  },
  reportBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 'auto',
  },
  reportBtnText: {
    ...XTypography.bodySmall,
    color: XColors.error,
    fontWeight: '600',
  },
  editInput: {
    marginBottom: XSpacing.sm,
    backgroundColor: XColors.background,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: XSpacing.sm,
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
  commentInputContainer: {
    padding: XSpacing.lg,
    borderTopWidth: 1,
    borderTopColor: XColors.border,
  },
  commentInput: {
    marginBottom: XSpacing.md,
    backgroundColor: XColors.background,
  },
  sendButton: {
    backgroundColor: XColors.primary,
    paddingVertical: XSpacing.md,
    borderRadius: XBorderRadius.full,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    ...XTypography.bodyMedium,
    color: '#ffffff',
    fontWeight: '700',
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
    fontSize: 18,
    marginRight: XSpacing.xs,
  },
  fabText: {
    ...XTypography.bodySmall,
    color: '#ffffff',
    fontWeight: '600',
  },
});
