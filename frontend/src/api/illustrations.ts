import client from './client';

export interface Illustration {
  id: number;
  user_id: number;
  prompt: string;
  style: string;
  size: string;
  image_url?: string;
  status: string; // pending, completed, failed
  description?: string;
  tags?: string;
  novel_id?: number;
  chapter_id?: number;  // A-P1: Link to specific chapter
  illustration_type: string; // cover, illustration
  created_at: string;
}

export interface CreateIllustrationData {
  prompt: string;
  style?: string;
  size?: string;
  illustration_type?: string;
  novel_id?: number;
  chapter_id?: number;  // A-P1: Link to specific chapter
}

export interface UpdateIllustrationData {
  description?: string;
  tags?: string;
  novel_id?: number;
  chapter_id?: number;  // A-P1: Link to specific chapter
  illustration_type?: string;
}

export const illustrationsApi = {
  create: (data: CreateIllustrationData) => client.post<Illustration>('/illustrations', data),
  getAll: (params?: { novel_id?: number; chapter_id?: number; illustration_type?: string }) =>
    client.get<Illustration[]>('/illustrations', { params }),
  getById: (id: number) => client.get<Illustration>(`/illustrations/${id}`),
  update: (id: number, data: UpdateIllustrationData) => client.put<Illustration>(`/illustrations/${id}`, data),
  unlinkNovel: (id: number) => client.put<Illustration>(`/illustrations/${id}/unlink-novel`),
  delete: (id: number) => client.delete(`/illustrations/${id}`),
  batchGenerate: (novelId: number) => client.post<{ generated: number; results: any[] }>('/illustrations/batch-generate', null, { params: { novel_id: novelId } }),
};
