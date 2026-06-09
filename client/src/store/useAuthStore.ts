import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/authApi';

export type UserRole = 'STORE_STAFF' | 'STORE_MANAGER' | 'HQ_STAFF' | 'ADMIN';

export interface User {
  id: number;
  email?: string;
  employeeCode?: string;
  name: string;
  role: UserRole;
  brandId: number;
  storeId: number;
  storeCode: string;
  storeName: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoggedIn: boolean;
  loading: boolean;

  login: (storeCode: string, employeeCode: string, password: string) => Promise<void>;
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

  login: async (storeCode, employeeCode, password) => {
    set({ loading: true });
    try {
      if (__DEV__) {
        // 개발 모드: 백엔드 없이도 UI 테스트 가능
        const mockUser: User = {
          id: 1,
          email: 'manager@jaju.com',
          employeeCode,
          name: '김민지',
          role: 'STORE_MANAGER',
          brandId: 1,
          storeId: Number(storeCode) || 1001,
          storeCode: storeCode || '1001',
          storeName: '강남점',
        };
        await AsyncStorage.setItem(ACCESS_TOKEN_KEY, 'dev-token');
        set({ accessToken: 'dev-token', user: mockUser, isLoggedIn: true });
        return;
      }
      const { accessToken, user } = await authApi.login(storeCode, employeeCode, password);
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
