export interface Novel {
  id: number;
  title: string;
  theme_description: string;
  genre?: string;
  style?: string;
  target_audience?: string;
  protagonist_info?: string;
  setting?: string;
  tone?: string;
  language?: string;
  max_chapters: number;
  total_word_count: number;
  status: string;
  is_published: boolean;
  cover_image_url?: string;
  created_at: string;
  updated_at?: string;
  chapters?: Chapter[];
  author?: {
    id: number;
    username: string;
    display_name?: string;
  };
}

export interface Chapter {
  id: number;
  novel_id: number;
  chapter_number: number;
  title: string;
  content: string;
  word_count: number;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface GenerationSession {
  id: number;
  novel_id: number;
  session_type: string;
  context_summary?: string;
  user_direction?: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateNovelData {
  title: string;
  theme_description: string;
  genre?: string;
  style?: string;
  target_audience?: string;
  protagonist_info?: string;
  setting?: string;
  tone?: string;
  language?: string;
  max_chapters?: number;
}
