import client from './client';

export interface QualityScore {
  novel_id: number;
  title: string;
  overall_score: number;
  components: {
    rating_score: number;
    review_score: number;
    reader_score: number;
    social_score: number;
    completion_score: number;
  };
  metrics: {
    avg_rating: number;
    review_count: number;
    like_count: number;
    reader_count: number;
    tip_count: number;
    is_completed: boolean;
  };
}

export interface EditorPick {
  id: number;
  title: string;
  genre?: string;
  author?: string;
  quality_score: number;
  score_details: QualityScore;
  created_at: string | null;
  cover_image_url?: string;
}

export interface TrendingNovel {
  id: number;
  title: string;
  genre?: string;
  author?: string;
  trending_score: number;
  recent_activity: {
    reviews: number;
    likes: number;
    readers: number;
  };
  created_at: string | null;
  cover_image_url?: string;
}

export interface RisingStar {
  id: number;
  title: string;
  genre?: string;
  author?: string;
  days_since_publication: number;
  engagement_rate: number;
  quality_score: number;
  combined_score: number;
  total_engagement: number;
  created_at: string | null;
  cover_image_url?: string;
}

export const qualityContentApi = {
  // Get editor's picks
  getEditorsPicks: (limit?: number, genre?: string) =>
    client.get<{ novels: EditorPick[] }>('/quality-content/editors-picks', {
      params: {
        ...(limit ? { limit } : {}),
        ...(genre ? { genre } : {}),
      },
    }),

  // Get trending novels
  getTrending: (limit?: number, days?: number, genre?: string) =>
    client.get<{ novels: TrendingNovel[] }>('/quality-content/trending', {
      params: {
        ...(limit ? { limit } : {}),
        ...(days ? { days } : {}),
        ...(genre ? { genre } : {}),
      },
    }),

  // Get rising stars
  getRisingStars: (limit?: number, days?: number) =>
    client.get<{ novels: RisingStar[] }>('/quality-content/rising-stars', {
      params: {
        ...(limit ? { limit } : {}),
        ...(days ? { days } : {}),
      },
    }),

  // Get quality score for a novel
  getQualityScore: (novelId: number) =>
    client.get<QualityScore>(`/quality-content/score/${novelId}`),

  // Get quality novels by genre
  getQualityByGenre: (genre: string, limit?: number) =>
    client.get<{ novels: EditorPick[] }>(`/quality-content/by-genre/${genre}`, {
      params: {
        ...(limit ? { limit } : {}),
      },
    }),
};
