import client from './client';

export interface NovelReview {
  id: number;
  novel_id: number;
  user_id: number;
  rating: number;
  review_text?: string;
  created_at: string;
  updated_at?: string;
  author?: {
    id: number;
    username: string;
    avatar_url?: string;
  };
}

export interface CreateReviewRequest {
  novel_id: number;
  rating: number;
  review_text?: string;
}

export interface UpdateReviewRequest {
  rating?: number;
  review_text?: string;
}

export const reviewsApi = {
  create: (data: CreateReviewRequest) => client.post<NovelReview>('/reviews', data),
  getByNovel: (novelId: number) => client.get<NovelReview[]>(`/reviews/novel/${novelId}`),
  getMine: () => client.get<NovelReview[]>('/reviews/mine'),
  update: (reviewId: number, data: UpdateReviewRequest) => client.put<NovelReview>(`/reviews/${reviewId}`, data),
  delete: (reviewId: number) => client.delete(`/reviews/${reviewId}`),
};
