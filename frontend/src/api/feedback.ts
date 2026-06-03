import client from './client';

export interface Feedback {
  id: number;
  user_id?: number;
  category: string;
  content: string;
  status: string;
  created_at: string;
}

export interface CreateFeedbackRequest {
  category: string;
  content: string;
}

export const feedbackApi = {
  submit: (data: CreateFeedbackRequest) => client.post<Feedback>('/feedback', data),
  getMine: () => client.get<Feedback[]>('/feedback/mine'),
};
