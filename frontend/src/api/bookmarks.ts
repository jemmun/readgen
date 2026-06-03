import client from './client';

export interface BookmarkItem {
  id: number;
  post_id: number;
  post?: {
    id: number;
    content: string;
    image_url?: string;
    created_at: string;
    author?: {
      id: number;
      username: string;
      display_name?: string;
    };
  };
  created_at: string;
}

export const bookmarksApi = {
  bookmark: (postId: number) => client.post(`/bookmarks/posts/${postId}/bookmark`),
  unbookmark: (postId: number) => client.delete(`/bookmarks/posts/${postId}/bookmark`),
  getMine: () => client.get<BookmarkItem[]>('/bookmarks/mine'),
};
