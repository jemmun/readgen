import client from './client';

export interface ShareReadingProgressData {
  novel_id: number;
  chapter_id?: number;
  chapter_number?: number;
  chapter_title?: string;
  progress_percentage?: number;
  thoughts?: string;
  rating?: number;
}

export interface ShareScreenshotData {
  novel_id: number;
  chapter_id?: number;
  screenshot_url?: string;
  caption?: string;
}

export const readingProgressShareApi = {
  shareProgress: (data: ShareReadingProgressData) =>
    client.post<{ post_id: number; message: string; post: any }>('/reading-progress/share', data),
  
  shareScreenshot: (data: ShareScreenshotData) =>
    client.post<{ post_id: number; message: string; post: any }>('/reading-progress/share-screenshot', data),
};
