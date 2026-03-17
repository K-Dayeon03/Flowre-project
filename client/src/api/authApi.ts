import { apiClient, unwrap } from './client';
import { User } from '../store/useAuthStore';

interface LoginResponse {
  accessToken: string;
  user: User;
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await apiClient.post('/api/auth/login', { email, password });
    return unwrap(res);
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/api/auth/logout');
  },

  me: async (token?: string): Promise<User> => {
    const res = await apiClient.get('/api/auth/me', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return unwrap(res);
  },

  refresh: async (): Promise<{ accessToken: string }> => {
    const res = await apiClient.post('/api/auth/refresh', {}, { withCredentials: true });
    return unwrap(res);
  },
};
