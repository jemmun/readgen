import client from './client';

export interface Tip {
  id: number;
  amount: number;
  message?: string;
  currency_type: string;
  created_at: string;
  from_user: {
    id: number;
    username: string;
    display_name: string;
  } | null;
}

export interface TipStats {
  total_tips: number;
  total_amount: number;
  avg_amount: number;
}

export interface UserTipStats {
  total_received: number;
  total_amount: number;
  top_novels: Array<{
    id: number;
    title: string;
    total_tips: number;
  }>;
}

export const tipsApi = {
  // Create a tip for a novel
  createTip: (data: {
    novel_id: number;
    chapter_id?: number;
    amount: number;
    message?: string;
    currency_type?: string;
  }) =>
    client.post<{
      id: number;
      amount: number;
      message?: string;
      created_at: string;
    }>('/tips', data),

  // Get tips for a novel
  getNovelTips: (novelId: number, limit?: number) =>
    client.get<{ tips: Tip[]; total: number }>(
      `/tips/novel/${novelId}`,
      { params: limit ? { limit } : undefined }
    ),

  // Get tip statistics for a novel
  getNovelTipStats: (novelId: number) =>
    client.get<TipStats>(`/tips/novel/${novelId}/stats`),

  // Get tip statistics for current user
  getUserTipStats: () =>
    client.get<UserTipStats>('/tips/user/stats'),

  // Get trending tipped novels
  getTrendingTippedNovels: (limit?: number, days?: number) =>
    client.get<{
      novels: Array<{
        novel: {
          id: number;
          title: string;
          cover_image_url?: string;
          genre?: string;
        };
        tip_count: number;
        total_amount: number;
      }>;
    }>('/tips/trending', {
      params: {
        ...(limit ? { limit } : {}),
        ...(days ? { days } : {}),
      },
    }),
};
