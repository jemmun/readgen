import client from './client';
import { Novel } from '../types';

export interface RecommendationResponse {
  recommendations: Novel[];
  reason?: string;
}

export const recommendationsApi = {
  // Get personalized recommendations for current user
  getRecommendations: (limit?: number) =>
    client.get<Novel[]>('/novels/recommendations', { 
      params: limit ? { limit } : undefined 
    }),

  // Get novels similar to a specific novel
  getSimilarNovels: (novelId: number, limit?: number) =>
    client.get<Novel[]>(`/novels/${novelId}/similar`, { 
      params: limit ? { limit } : undefined 
    }),

  // Get trending novels in a specific genre
  getTrendingInGenre: (genre: string, limit?: number, days?: number) =>
    client.get<Novel[]>(`/novels/trending/${genre}`, { 
      params: { 
        ...(limit ? { limit } : {}),
        ...(days ? { days } : {})
      } 
    }),
};
