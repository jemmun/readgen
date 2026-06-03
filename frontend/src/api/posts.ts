import client from './client';

export interface Post {
  id: number;
  user_id: number;
  novel_id?: number;
  group_id?: number;
  content: string;
  tag?: string;
  status?: string;
  approval_note?: string;
  image_url?: string;
  image_urls?: string[];  // Multi-image support
  allow_comments?: boolean;
  allow_repost?: boolean;
  allow_share?: boolean;
  repost_of?: number;
  repost_count?: number;
  reposters?: Array<{
    id: number;
    username: string;
    display_name?: string;
  }>;
  likers?: Array<{
    id: number;
    username: string;
    display_name?: string;
  }>;
  original_post?: {
    id: number;
    user_id: number;
    content: string;
    created_at: string;
    author?: {
      id: number;
      username: string;
      display_name?: string;
    };
  };
  created_at: string;
  updated_at?: string;
  author?: {
    id: number;
    username: string;
    display_name?: string;
  };
  like_count: number;
  comment_count: number;
  is_liked_by_me: boolean;
}

export interface CreatePostRequest {
  content: string;
  tag?: string;
  image_url?: string;
  image_urls?: string[];  // Multi-image support
  group_id?: number;
  allow_comments?: boolean;
  allow_repost?: boolean;
  allow_share?: boolean;
}

export const postsApi = {
  create: (data: CreatePostRequest) => client.post<Post>('/posts', data),
  uploadImage: (file: FormData) => client.post<{ url: string }>('/posts/upload-image', file, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getFeed: () => client.get<Post[]>('/posts/feed'),
  getAll: () => client.get<Post[]>('/posts'),
  getTrending: () => client.get<Post[]>('/posts/trending'),
  getById: (id: number) => client.get<Post>(`/posts/${id}`),
  delete: (id: number) => client.delete(`/posts/${id}`),
  update: (id: number, data: { content?: string; image_url?: string }) => client.put<Post>(`/posts/${id}`, data),
  generateNovel: (postId: number) => client.post(`/posts/${postId}/generate-novel`),
  repost: (postId: number) => client.post<Post>(`/posts/${postId}/repost`),
  forwardToGroup: (postId: number, groupId: number) =>
    client.post<Post>(`/posts/${postId}/forward-to-group/${groupId}`),
};
