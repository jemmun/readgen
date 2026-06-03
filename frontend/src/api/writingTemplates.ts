import client from './client';

export interface GenreTemplate {
  genre: string;
  name: string;
  description: string;
  structure: Array<{
    chapter: number;
    title: string;
    description: string;
  }>;
  themes: string[];
  tropes: string[];
}

export interface StoryStructure {
  name: string;
  description: string;
  acts?: Array<{
    act: number;
    name: string;
    chapters: string;
    description: string;
  }>;
  stages?: Array<{
    stage: string;
    description: string;
  }>;
}

export interface GeneratedOutline {
  genre: string;
  template_name: string;
  chapters: Array<{
    chapter_number: number;
    title: string;
    description: string;
  }>;
  themes: string[];
  tropes: string[];
}

export const writingTemplatesApi = {
  // List all genre templates
  listGenres: () =>
    client.get<{
      templates: Array<{
        genre: string;
        name: string;
        description: string;
        chapter_count: number;
      }>;
    }>('/writing-templates/genres'),

  // Get detailed genre template
  getGenreTemplate: (genre: string) =>
    client.get<GenreTemplate>(`/writing-templates/genres/${genre}`),

  // List story structures
  listStructures: () =>
    client.get<{
      structures: Array<{
        structure: string;
        name: string;
        description: string;
      }>;
    }>('/writing-templates/structures'),

  // Get detailed story structure
  getStoryStructure: (structure: string) =>
    client.get<StoryStructure>(`/writing-templates/structures/${structure}`),

  // Generate outline from template
  generateOutline: (data: {
    genre: string;
    custom_title?: string;
    num_chapters?: number;
  }) =>
    client.post<GeneratedOutline>('/writing-templates/generate-outline', data, {
      params: {
        genre: data.genre,
        custom_title: data.custom_title,
        num_chapters: data.num_chapters,
      },
    }),
};
