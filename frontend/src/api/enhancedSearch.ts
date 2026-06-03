import client from './client';

export interface SearchFilters {
  genre?: string;
  style?: string;
  tone?: string;
  target_audience?: string;
  status?: string;
  is_completed?: boolean;
  min_word_count?: number;
  max_word_count?: number;
}

export interface SearchResult {
  id: number;
  title: string;
  genre?: string;
  style?: string;
  tone?: string;
  target_audience?: string;
  total_word_count: number;
  status: string;
  created_at: string | null;
  author?: string;
  cover_image_url?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface SearchSuggestion {
  type: 'title' | 'genre';
  text: string;
}

export interface SuggestionsResponse {
  suggestions: SearchSuggestion[];
  query: string;
}

export interface SearchStats {
  genres: Array<{ name: string; count: number }>;
  styles: Array<{ name: string; count: number }>;
  target_audiences: Array<{ name: string; count: number }>;
}

export const enhancedSearchApi = {
  // Advanced search with filters (POST)
  advancedSearch: (data: {
    query: string;
    filters?: SearchFilters;
    page?: number;
    page_size?: number;
  }) =>
    client.post<SearchResponse>('/search/novels', {
      query: data.query,
      ...data.filters,
    }, {
      params: {
        page: data.page || 1,
        page_size: data.page_size || 20,
      },
    }),

  // Simple search (GET)
  simpleSearch: (params: {
    q: string;
    genre?: string;
    style?: string;
    page?: number;
    page_size?: number;
  }) =>
    client.get<SearchResponse>('/search/novels', { params }),

  // Get autocomplete suggestions
  getSuggestions: (query: string, limit?: number) =>
    client.get<SuggestionsResponse>('/search/suggestions', {
      params: {
        q: query,
        ...(limit ? { limit } : {}),
      },
    }),

  // Get search filter statistics
  getStats: () =>
    client.get<SearchStats>('/search/stats'),
};
