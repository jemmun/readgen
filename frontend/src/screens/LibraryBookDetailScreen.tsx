import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { Text, Button, ActivityIndicator, Chip, Surface, IconButton } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Novel, Chapter } from '../types';
import { novelsApi } from '../api/novels';
import { chaptersApi } from '../api/chapters';
import { reviewsApi, NovelReview } from '../api/reviews';
import { XColors, XTypography, XSpacing, XBorderRadius } from '../theme/xStyle';

type Props = StackScreenProps<RootStackParamList, 'LibraryBookDetail'>;

export default function LibraryBookDetailScreen({ navigation, route }: Props) {
  const { novelId } = route.params;
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<NovelReview[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [novelRes, chaptersRes, reviewsRes] = await Promise.all([
        novelsApi.get(novelId),
        chaptersApi.listByNovel(novelId),
        reviewsApi.getByNovel(novelId),
      ]);
      setNovel(novelRes.data);
      setChapters(chaptersRes.data);
      setReviews(reviewsRes.data);
    } catch (error) {
      console.error('Failed to load book:', error);
    } finally {
      setLoading(false);
    }
  }, [novelId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRead = (chapterId?: number) => {
    navigation.navigate('Reader', { novelId, chapterId, readOnly: true });
  };

  const handleAuthorPress = () => {
    if (novel?.author) {
      navigation.navigate('UserProfile', { userId: novel.author.id });
    }
  };

  const handleGenrePress = (genre?: string) => {
    if (!genre) return;
    navigation.navigate('Home', { activeTab: 'library' });
  };

  const handleSubmitReview = async () => {
    try {
      setSubmittingReview(true);
      await reviewsApi.create({
        novel_id: novelId,
        rating: reviewRating,
        review_text: reviewText || undefined,
      });
      setShowReviewModal(false);
      setReviewText('');
      setReviewRating(5);
      // Reload reviews
      const reviewsRes = await reviewsApi.getByNovel(novelId);
      setReviews(reviewsRes.data);
    } catch (error: any) {
      console.error('Failed to submit review:', error);
      alert(error.response?.data?.detail || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 'N/A';

  if (loading || !novel) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={XColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Cover */}
        <View style={styles.coverSection}>
          <View style={styles.cover}>
            <Text style={styles.coverText}>{novel.title.charAt(0)}</Text>
          </View>
        </View>

        {/* Title & Genre */}
        <Text style={styles.title}>{novel.title}</Text>
        <View style={styles.chipRow}>
          {novel.genre && (
            <TouchableOpacity onPress={() => handleGenrePress(novel.genre)}>
              <Chip style={styles.chip} textStyle={styles.chipText}>{novel.genre}</Chip>
            </TouchableOpacity>
          )}
          {novel.style && <Chip style={styles.chip} textStyle={styles.chipText}>{novel.style}</Chip>}
          {novel.tone && <Chip style={styles.chip} textStyle={styles.chipText}>{novel.tone}</Chip>}
        </View>

        {/* Author */}
        {novel.author && (
          <TouchableOpacity style={styles.authorRow} onPress={handleAuthorPress} activeOpacity={0.7}>
            <View style={styles.authorAvatar}>
              <Text style={styles.authorAvatarText}>
                {(novel.author.display_name || novel.author.username)[0].toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.authorName}>{novel.author.display_name || novel.author.username}</Text>
              <Text style={styles.authorHandle}>@{novel.author.username}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{novel.total_word_count}</Text>
            <Text style={styles.statLabel}>Words</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{chapters.length}</Text>
            <Text style={styles.statLabel}>Chapters</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{novel.status}</Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>

        {/* Synopsis */}
        {novel.theme_description && (
          <Surface style={styles.synopsisCard} elevation={1}>
            <Text style={styles.synopsisTitle}>Synopsis</Text>
            <Text style={styles.synopsisText}>{novel.theme_description}</Text>
          </Surface>
        )}

        {/* Extra design fields */}
        {(novel.target_audience || novel.protagonist_info || novel.setting) && (
          <Surface style={styles.synopsisCard} elevation={1}>
            <Text style={styles.synopsisTitle}>About</Text>
            {novel.target_audience && (
              <Text style={styles.aboutText}><Text style={styles.aboutLabel}>Audience: </Text>{novel.target_audience}</Text>
            )}
            {novel.protagonist_info && (
              <Text style={styles.aboutText}><Text style={styles.aboutLabel}>Protagonist: </Text>{novel.protagonist_info}</Text>
            )}
            {novel.setting && (
              <Text style={styles.aboutText}><Text style={styles.aboutLabel}>Setting: </Text>{novel.setting}</Text>
            )}
          </Surface>
        )}

        {/* Chapter List */}
        {chapters.length > 0 && (
          <View style={styles.chapterSection}>
            <Text style={styles.chapterSectionTitle}>Chapters ({chapters.length})</Text>
            {chapters.map((chapter) => (
              <TouchableOpacity
                key={chapter.id}
                style={styles.chapterItem}
                onPress={() => handleRead(chapter.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.chapterTitle}>
                  Ch.{chapter.chapter_number} {chapter.title}
                </Text>
                <Text style={styles.chapterMeta}>{chapter.word_count} words</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Reviews Section */}
        <Surface style={styles.reviewsCard} elevation={1}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.reviewsTitle}>Reviews ({reviews.length})</Text>
            <View style={styles.ratingSummary}>
              <Text style={styles.averageRating}>{averageRating}</Text>
              <Text style={styles.ratingStars}>{'★'.repeat(Math.round(Number(averageRating) || 0))}{'☆'.repeat(5 - Math.round(Number(averageRating) || 0))}</Text>
            </View>
          </View>
          
          <Button
            mode="outlined"
            onPress={() => setShowReviewModal(true)}
            style={styles.writeReviewButton}
            icon="pencil"
          >
            Write a Review
          </Button>

          {reviews.length > 0 && (
            <View style={styles.reviewsList}>
              {reviews.slice(0, 5).map((review) => (
                <View key={review.id} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewAuthor}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>
                          {review.author?.username?.[0]?.toUpperCase() || 'U'}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.reviewAuthorName}>{review.author?.username || 'Anonymous'}</Text>
                        <Text style={styles.reviewDate}>
                          {new Date(review.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.reviewRating}>
                      <Text style={styles.reviewStars}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text>
                    </View>
                  </View>
                  {review.review_text && (
                    <Text style={styles.reviewText}>{review.review_text}</Text>
                  )}
                </View>
              ))}
              {reviews.length > 5 && (
                <Text style={styles.moreReviewsText}>+ {reviews.length - 5} more reviews</Text>
              )}
            </View>
          )}
        </Surface>
      </ScrollView>

      {/* Bottom Start Reading Button */}
      <Surface style={styles.bottomBar} elevation={4}>
        <Button
          mode="contained"
          onPress={() => handleRead(chapters[0]?.id)}
          style={styles.readButton}
          icon="book-open-variant"
          disabled={chapters.length === 0}
        >
          {chapters.length > 0 ? 'Start Reading' : 'No Chapters Yet'}
        </Button>
      </Surface>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent} elevation={4}>
            <Text style={styles.modalTitle}>Write a Review</Text>
            
            {/* Rating Selection */}
            <Text style={styles.modalLabel}>Rating</Text>
            <View style={styles.ratingSelector}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setReviewRating(star)}
                  style={styles.starButton}
                >
                  <Text style={[
                    styles.starIcon,
                    star <= reviewRating ? styles.starActive : styles.starInactive
                  ]}>
                    {star <= reviewRating ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Review Text */}
            <Text style={styles.modalLabel}>Review (optional)</Text>
            <TextInput
              style={styles.reviewInput}
              multiline
              numberOfLines={4}
              placeholder="Share your thoughts about this novel..."
              value={reviewText}
              onChangeText={setReviewText}
              textAlignVertical="top"
            />
            
            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowReviewModal(false)}
                style={styles.modalCancelButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSubmitReview}
                style={styles.modalSubmitButton}
                disabled={submittingReview}
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>
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
    padding: XSpacing.lg,
    paddingBottom: 100,
  },

  // Cover
  coverSection: {
    alignItems: 'center',
    marginBottom: XSpacing.lg,
  },
  cover: {
    width: 160,
    height: 220,
    backgroundColor: XColors.primary,
    borderRadius: XBorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  coverText: {
    fontSize: 64,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Title
  title: {
    ...XTypography.headlineMedium,
    color: XColors.textPrimary,
    textAlign: 'center',
    marginBottom: XSpacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: XSpacing.md,
    gap: XSpacing.xs,
  },
  chip: {
    backgroundColor: 'rgba(29, 155, 240, 0.12)',
  },
  chipText: {
    color: XColors.primary,
    fontWeight: '600',
  },

  // Author
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: XSpacing.lg,
    padding: XSpacing.sm,
    borderRadius: XBorderRadius.md,
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: XBorderRadius.full,
    backgroundColor: XColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: XSpacing.sm,
  },
  authorAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  authorName: {
    ...XTypography.bodyMedium,
    color: XColors.textPrimary,
    fontWeight: '600',
  },
  authorHandle: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: XSpacing.lg,
    paddingVertical: XSpacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: XColors.border,
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

  // Synopsis
  synopsisCard: {
    padding: XSpacing.lg,
    borderRadius: XBorderRadius.md,
    backgroundColor: XColors.surface,
    marginBottom: XSpacing.lg,
  },
  synopsisTitle: {
    ...XTypography.titleLarge,
    color: XColors.textPrimary,
    fontWeight: '700',
    marginBottom: XSpacing.sm,
  },
  synopsisText: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
    lineHeight: 22,
  },
  aboutText: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
    marginBottom: XSpacing.xs,
  },
  aboutLabel: {
    color: XColors.textPrimary,
    fontWeight: '600',
  },

  // Chapters
  chapterSection: {
    marginTop: XSpacing.sm,
  },
  chapterSectionTitle: {
    ...XTypography.titleLarge,
    color: XColors.textPrimary,
    fontWeight: '700',
    marginBottom: XSpacing.md,
  },
  chapterItem: {
    paddingVertical: XSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
  },
  chapterTitle: {
    ...XTypography.bodyMedium,
    color: XColors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  chapterMeta: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },

  // Bottom Bar
  bottomBar: {
    padding: XSpacing.md,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: XColors.border,
  },
  readButton: {
    width: '100%',
  },

  // Reviews
  reviewsCard: {
    padding: XSpacing.lg,
    borderRadius: XBorderRadius.md,
    backgroundColor: XColors.surface,
    marginTop: XSpacing.lg,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: XSpacing.md,
  },
  reviewsTitle: {
    ...XTypography.titleLarge,
    color: XColors.textPrimary,
    fontWeight: '700',
  },
  ratingSummary: {
    alignItems: 'flex-end',
  },
  averageRating: {
    ...XTypography.titleLarge,
    color: XColors.primary,
    fontWeight: '700',
  },
  ratingStars: {
    fontSize: 16,
    color: '#FFB800',
  },
  writeReviewButton: {
    marginBottom: XSpacing.md,
    borderColor: XColors.primary,
  },
  reviewsList: {
    marginTop: XSpacing.sm,
  },
  reviewItem: {
    paddingVertical: XSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: XSpacing.xs,
  },
  reviewAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: XBorderRadius.full,
    backgroundColor: XColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: XSpacing.sm,
  },
  reviewAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  reviewAuthorName: {
    ...XTypography.bodyMedium,
    color: XColors.textPrimary,
    fontWeight: '600',
  },
  reviewDate: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },
  reviewRating: {
    alignItems: 'flex-end',
  },
  reviewStars: {
    fontSize: 16,
    color: '#FFB800',
  },
  reviewText: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
    lineHeight: 20,
    marginTop: XSpacing.xs,
  },
  moreReviewsText: {
    ...XTypography.bodyMedium,
    color: XColors.primary,
    textAlign: 'center',
    marginTop: XSpacing.md,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    padding: XSpacing.lg,
    borderTopLeftRadius: XBorderRadius.lg,
    borderTopRightRadius: XBorderRadius.lg,
    backgroundColor: XColors.surface,
    maxHeight: '80%',
  },
  modalTitle: {
    ...XTypography.titleLarge,
    color: XColors.textPrimary,
    fontWeight: '700',
    marginBottom: XSpacing.lg,
    textAlign: 'center',
  },
  modalLabel: {
    ...XTypography.bodyMedium,
    color: XColors.textPrimary,
    fontWeight: '600',
    marginBottom: XSpacing.sm,
  },
  ratingSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: XSpacing.lg,
    gap: XSpacing.xs,
  },
  starButton: {
    padding: XSpacing.xs,
  },
  starIcon: {
    fontSize: 36,
  },
  starActive: {
    color: '#FFB800',
  },
  starInactive: {
    color: '#D1D5DB',
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: XColors.border,
    borderRadius: XBorderRadius.md,
    padding: XSpacing.md,
    fontSize: 15,
    color: XColors.textPrimary,
    backgroundColor: '#F9FAFB',
    minHeight: 100,
    marginBottom: XSpacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: XSpacing.md,
  },
  modalCancelButton: {
    flex: 1,
    borderColor: XColors.border,
  },
  modalSubmitButton: {
    flex: 1,
    backgroundColor: XColors.primary,
  },
});
