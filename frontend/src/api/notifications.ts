import client from './client';

export interface NotificationItem {
  id: number;
  type: string;
  category: string;
  message?: string;
  is_read: boolean;
  post_id?: number;
  group_id?: number;
  actor?: {
    id: number;
    username: string;
    display_name?: string;
  };
  created_at: string;
}

export interface GroupedNotification {
  type: string;
  category: string;
  date: string;
  count: number;
  is_read: boolean;
  actors: Array<{
    id: number;
    username: string;
    display_name?: string;
  }>;
  latest_message?: string;
  latest_created_at: string;
}

export interface NotificationSettings {
  enable_interaction: boolean;
  enable_collaboration: boolean;
  enable_feedback: boolean;
  enable_system: boolean;
  enable_achievement: boolean;
}

export const notificationsApi = {
  getAll: (params?: { category?: string; search?: string; page?: number; page_size?: number }) =>
    client.get<{ notifications: NotificationItem[]; total: number; page: number; page_size: number; has_more: boolean }>('/notifications', { params }),
  getUnreadCount: () => client.get<{ unread_count: number }>('/notifications/unread-count'),
  getUnreadCountByCategory: () => client.get<Record<string, number>>('/notifications/unread-count-by-category'),
  markRead: (id: number) => client.put(`/notifications/${id}/read`),
  markAllRead: () => client.put('/notifications/read-all'),
  getGrouped: () => client.get<GroupedNotification[]>('/notifications/grouped'),
  getSettings: () => client.get<NotificationSettings>('/notifications/settings'),
  updateSettings: (settings: NotificationSettings) => client.put('/notifications/settings', settings),
};
