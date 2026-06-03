import AsyncStorage from '@react-native-async-storage/async-storage';
import client from './client';

export interface RegisterRequest {
  username: string;
  password: string;
  display_name?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: number;
}

export interface UserProfile {
  id: number;
  username: string;
  display_name?: string;
  bio?: string;
  created_at?: string;
}

const TOKEN_KEY = 'auth_token';

export const authApi = {
  register: (data: RegisterRequest) => client.post<AuthResponse>('/auth/register', data),
  login: (data: LoginRequest) => client.post<AuthResponse>('/auth/login', data),
  me: () => client.get<UserProfile>('/auth/me'),
  generateQRToken: () => client.post<{ token: string; expires_at: string }>('/auth/qr-token'),
  qrLogin: (token: string) => client.post<AuthResponse>('/auth/qr-login', { token }),
  qrStatus: (token: string) => client.get<{ status: string; user_id?: number }>(`/auth/qr-login/status/${token}`),
  oauthLogin: (data: { provider: string; token: string; email?: string; name?: string }) =>
    client.post<AuthResponse>('/auth/oauth', data),

  getToken: async () => AsyncStorage.getItem(TOKEN_KEY),
  setToken: async (token: string) => AsyncStorage.setItem(TOKEN_KEY, token),
  removeToken: async () => AsyncStorage.removeItem(TOKEN_KEY),
};

export async function initAuthHeaders() {
  const token = await authApi.getToken();
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
}
