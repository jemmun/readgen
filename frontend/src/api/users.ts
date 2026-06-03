import client from './client';
import { Novel } from '../types';

export interface UserProfile {
  id: number;
  username: string;
  display_name?: string;
  bio?: string;
  created_at?: string;
}

export interface UserStats {
  follower_count: number;
  following_count: number;
  post_count: number;
  novel_count: number;
}

export interface WriterStats {
  total_words: number;
  total_chapters: number;
  total_novels: number;
  total_reviews: number;
  avg_rating: number;
  writing_since: string | null;
  most_popular_novel: {
    id: number | null;
    title: string | null;
    review_count: number;
  } | null;
}

export interface TimelineItem {
  type: 'novel';
  id: number;
  title: string;
  description: string;
  created_at: string | null;
  chapter_count: number;
  word_count: number;
  genre: string;
}

export const usersApi = {
  getById: (id: number) => client.get<UserProfile>(`/users/${id}`),
  getPosts: (id: number) => client.get(`/users/${id}/posts`),
  getNovels: (id: number) => client.get<Novel[]>(`/users/${id}/novels`),
  getFollowers: (id: number) => client.get<UserProfile[]>(`/users/${id}/followers`),
  getFollowing: (id: number) => client.get<UserProfile[]>(`/users/${id}/following`),
  getStats: (id: number) => client.get<UserStats>(`/users/${id}/stats`),
  getWriterStats: (id: number) => client.get<WriterStats>(`/users/${id}/writer-stats`),
  getWritingTimeline: (id: number, limit?: number) => client.get<TimelineItem[]>(`/users/${id}/writing-timeline`, { params: { limit } }),
  search: (query: string) => client.get<UserProfile[]>(`/users/search/${query}`),

  follow: (userId: number) => client.post(`/follows/users/${userId}/follow`),
  unfollow: (userId: number) => client.delete(`/follows/users/${userId}/unfollow`),
  isFollowing: (userId: number) => client.get<{ is_following: boolean }>(`/follows/users/${userId}/is-following`),

  updateProfile: (data: { display_name?: string; bio?: string }) => client.put<UserProfile>('/users/me', data),
};
