import client from './client';
import { Novel, CreateNovelData } from '../types';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export const novelsApi = {
  create: (data: CreateNovelData) =>
    client.post<Novel>('/novels', data),

  list: (genre?: string) =>
    client.get<Novel[]>('/novels', { params: genre ? { genre } : undefined }),

  get: (id: number) =>
    client.get<Novel>(`/novels/${id}`),

  update: (id: number, data: Partial<CreateNovelData>) =>
    client.put<Novel>(`/novels/${id}`, data),

  publish: (id: number) =>
    client.post<{ is_published: boolean; message: string }>(`/novels/${id}/publish`),

  delete: (id: number) =>
    client.delete(`/novels/${id}`),

  search: (q: string) =>
    client.get<Novel[]>('/novels/search', { params: { q } }),

  recommended: () =>
    client.get<Novel[]>('/novels/recommended'),

  genres: () =>
    client.get<{ genres: string[] }>('/novels/genres'),

  all: (params?: {
    page?: number;
    page_size?: number;
    genre?: string;
    style?: string;
    tone?: string;
    target_audience?: string;
    status?: string;
    is_completed?: boolean;
  }) =>
    client.get<PaginatedResponse<Novel>>('/novels/all', { params }),

  share: (id: number) =>
    client.post<{ share_url: string; novel_id: number; title: string }>(`/novels/${id}/share`),

  getRankings: (params: { period?: string; genre?: string; limit?: number }) =>
    client.get<any>('/novels/rankings', { params }),

  getNewReleases: (params?: { limit?: number; days?: number; genre?: string }) =>
    client.get<Novel[]>('/novels/new-releases', { params }),

  getEditorPicks: (params?: { limit?: number; genre?: string }) =>
    client.get<Novel[]>('/novels/editor-picks', { params }),

  getTrendingNew: (params?: { limit?: number; days?: number }) =>
    client.get<Novel[]>('/novels/trending-new', { params }),

  getPopularTags: (limit?: number) =>
    client.get<{
      genres: Array<{ name: string; count: number }>;
      styles: Array<{ name: string; count: number }>;
      tones: Array<{ name: string; count: number }>;
      target_audiences: Array<{ name: string; count: number }>;
    }>('/novels/tags/popular', { params: limit ? { limit } : undefined }),
};
