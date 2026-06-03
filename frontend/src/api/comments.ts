import client from './client';

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  tag?: string;
  parent_id?: number;
  adopted: boolean;
  created_at: string;
  updated_at?: string;
  author?: {
    id: number;
    username: string;
    display_name?: string;
  };
}

export interface CreateCommentRequest {
  content: string;
  tag?: string;
  parent_id?: number;
}

export const commentsApi = {
  create: (postId: number, data: CreateCommentRequest) =>
    client.post<Comment>(`/comments/posts/${postId}/comments`, data),
  getByPost: (postId: number) =>
    client.get<Comment[]>(`/comments/posts/${postId}/comments`),
  adopt: (commentId: number) =>
    client.post(`/comments/${commentId}/adopt`),
  delete: (commentId: number) =>
    client.delete(`/comments/${commentId}`),
};
