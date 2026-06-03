import client from './client';

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: number;
  created_at: string;
}

export interface Conversation {
  partner_id: number;
  partner?: {
    id: number;
    username: string;
    display_name?: string;
  };
  last_message: string;
  last_at: string;
}

export const messagesApi = {
  send: (receiverId: number, content: string) =>
    client.post('/messages', { receiver_id: receiverId, content }),
  getConversations: () =>
    client.get<Conversation[]>('/messages/conversations'),
  getWithUser: (userId: number) =>
    client.get<Message[]>(`/messages/with/${userId}`),
};
