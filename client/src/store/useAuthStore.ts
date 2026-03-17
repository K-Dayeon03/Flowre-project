import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/authApi';

export type UserRole = 'STORE_STAFF' | 'STORE_MANAGER' | 'HQ_STAFF' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  brandId: number;
  storeId: number;
  storeName: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoggedIn: boolean;
  loading: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (accessToken: string) => void;
  restoreSession: () => Promise<void>;
}

const ACCESS_TOKEN_KEY = 'flowre_access_token';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoggedIn: false,
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      // 개발 모드: 백엔드 없이 바로 로그인 (임의 계정 허용)
      if (__DEV__) {
        const mockUser: User = {
          id: 1,
          email,
          name: '김민지',
          role: 'STORE_MANAGER',
          brandId: 1,
          storeId: 1,
          storeName: '강남점',
        };
        await AsyncStorage.setItem(ACCESS_TOKEN_KEY, 'dev-token');
        set({ accessToken: 'dev-token', user: mockUser, isLoggedIn: true });
        return;
      }
      const { accessToken, user } = await authApi.login(email, password);
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      set({ accessToken, user, isLoggedIn: true });
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    await authApi.logout().catch(() => {});
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
    set({ user: null, accessToken: null, isLoggedIn: false });
  },

  setTokens: (accessToken) => {
    set({ accessToken });
    AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  },

  restoreSession: async () => {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return;
    try {
      const user = await authApi.me(token);
      set({ accessToken: token, user, isLoggedIn: true });
    } catch {
      await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  },
}));
