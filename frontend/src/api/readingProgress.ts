import client from './client';

export interface ReadingProgressData {
  novel_id: number;
  chapter_id: number | null;
  scroll_position: number;
}

export const readingProgressApi = {
  save: (data: ReadingProgressData) => client.put('/reading-progress', data),
  get: (novelId: number) => client.get<ReadingProgressData>(`/reading-progress/${novelId}`),
};
