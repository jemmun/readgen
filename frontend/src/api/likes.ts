import client from './client';

export const likesApi = {
  like: (postId: number) => client.post(`/likes/posts/${postId}/like`),
  unlike: (postId: number) => client.delete(`/likes/posts/${postId}/like`),
};
