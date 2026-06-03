import client from './client';

export interface Group {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  is_private: boolean;
  created_at: string;
  updated_at?: string;
  owner?: {
    id: number;
    username: string;
    display_name?: string;
  };
  member_count: number;
  my_role?: string; // 'owner' | 'admin' | 'member' | null
}

export interface CreateGroupData {
  name: string;
  description?: string;
  is_private?: boolean;
}

export interface GroupMember {
  id: number;
  username: string;
  display_name?: string;
  role: string;
  joined_at?: string;
}

export const groupsApi = {
  create: (data: CreateGroupData) => client.post<Group>('/groups', data),
  getAll: () => client.get<Group[]>('/groups'),
  discover: () => client.get<Group[]>('/groups/discover'),
  getById: (id: number) => client.get<Group>(`/groups/${id}`),
  update: (id: number, data: Partial<CreateGroupData>) => client.put<Group>(`/groups/${id}`, data),
  delete: (id: number) => client.delete(`/groups/${id}`),
  addMember: (groupId: number, userId: number) => 
    client.post(`/groups/${groupId}/members`, { user_id: userId }),
  joinGroup: (groupId: number) =>
    client.post(`/groups/${groupId}/members`, { user_id: 0 }),
  getMembers: (groupId: number) => 
    client.get<GroupMember[]>(`/groups/${groupId}/members`),
  removeMember: (groupId: number, userId: number) =>
    client.delete(`/groups/${groupId}/members/${userId}`),
  getPosts: (groupId: number, tag?: string, statusFilter?: string) => {
    const params = new URLSearchParams();
    if (tag) params.append('tag', tag);
    if (statusFilter) params.append('status_filter', statusFilter);
    const qs = params.toString();
    return client.get(`/groups/${groupId}/posts${qs ? '?' + qs : ''}`);
  },
  approvePost: (groupId: number, postId: number, note?: string) =>
    client.post(`/groups/${groupId}/posts/${postId}/approve`, note ? { note } : {}),
  rejectPost: (groupId: number, postId: number, note?: string) =>
    client.post(`/groups/${groupId}/posts/${postId}/reject`, note ? { note } : {}),
  updateMemberRole: (groupId: number, userId: number, role: string) =>
    client.put(`/groups/${groupId}/members/${userId}/role?role=${encodeURIComponent(role)}`),
  generateNovelDesign: (groupId: number) =>
    client.post<{
      title: string;
      theme_description: string;
      genre?: string;
      style?: string;
      tone?: string;
      setting?: string;
      protagonist_info?: string;
      target_audience?: string;
      language?: string;
      max_chapters?: number;
      group_id: number;
    }>(`/groups/${groupId}/novel-design`),

  assignChapter: (groupId: number, chapterNumber: number, memberId: number) =>
    client.post(`/groups/${groupId}/assign-chapter`, null, { params: { chapter_number: chapterNumber, member_id: memberId } }),

  getLeaderboard: (params: { period?: string; limit?: number }) =>
    client.get<any>('/groups/leaderboard', { params }),
};
