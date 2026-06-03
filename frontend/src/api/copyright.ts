import client from './client';

export interface ContentFingerprint {
  fingerprint: string;
  title_hash?: string;
  word_count: number;
  chapter_number: number;
  created_at: string | null;
}

export interface NovelFingerprint {
  novel_id: number;
  novel_title: string;
  fingerprint: string;
  total_chapters: number;
  total_word_count: number;
  chapter_fingerprints: ContentFingerprint[];
  generated_at: string;
}

export interface CopyrightRegistration {
  novel_id: number;
  title: string;
  author_id: number;
  copyright_fingerprint: NovelFingerprint;
  registered_at: string;
  message: string;
}

export interface ContentMatch {
  chapter_number: number;
  chapter_title: string;
  match_type: 'exact' | 'partial';
  confidence: number;
}

export interface ContentVerification {
  novel_id: number;
  novel_title: string;
  submitted_fingerprint: string;
  matches: ContentMatch[];
  total_matches: number;
  is_original: boolean;
}

export interface CopyrightInfo {
  novel_id: number;
  title: string;
  author: string;
  created_at: string | null;
  fingerprint: NovelFingerprint;
  copyright_notice: string;
}

export const copyrightApi = {
  // Register copyright for a novel
  registerCopyright: (novelId: number) =>
    client.post<CopyrightRegistration>('/copyright/register', {
      novel_id: novelId,
    }),

  // Verify content ownership
  verifyContent: (data: {
    novel_id: number;
    content: string;
  }) =>
    client.post<ContentVerification>('/copyright/verify', data),

  // Get copyright information
  getCopyrightInfo: (novelId: number) =>
    client.get<CopyrightInfo>(`/copyright/info/${novelId}`),

  // Add copyright notice to novel
  addCopyrightNotice: (novelId: number) =>
    client.post<{
      message: string;
      updated_chapters: number[];
      total_updated: number;
    }>(`/copyright/add-notice/${novelId}`),
};
