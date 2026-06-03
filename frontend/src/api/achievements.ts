import client from './client';

export const achievementsApi = {
  getAll: (params?: { category?: string }) =>
    client.get<any[]>('/achievements/', { params }),

  getMyAchievements: (params?: { category?: string }) =>
    client.get<any[]>('/achievements/my', { params }),

  checkAchievements: () =>
    client.post<any>('/achievements/check'),
};
