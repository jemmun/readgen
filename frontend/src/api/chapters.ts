import client from './client';
import { Chapter } from '../types';

export const chaptersApi = {
  listByNovel: (novelId: number) =>
    client.get<Chapter[]>(`/novels/${novelId}/chapters`),

  get: (id: number) =>
    client.get<Chapter>(`/novels/chapters/${id}`),

  update: (id: number, data: Partial<Chapter>) =>
    client.put<Chapter>(`/novels/chapters/${id}`, data),
};
