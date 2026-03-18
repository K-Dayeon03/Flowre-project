import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/authApi';

export type UserRole = 'STORE_STAFF' | 'STORE_MANAGER' | 'HQ_STAFF' | 'ADMIN';

export interface User {
  id: number;
  employeeCode: string;
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

  login: async (employeeCode, password) => {
    set({ loading: true });
    try {
      if (__DEV__) {
        // 개발 모드: 백엔드 없이도 UI 테스트 가능
        const mockUser: User = {
          id: 1,
          employeeCode,
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
      const { accessToken, user } = await authApi.login(employeeCode, password);
      const mappedUser: User = { ...user, employeeCode: (user as any).email ?? employeeCode };
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      set({ accessToken, user: mappedUser, isLoggedIn: true });
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
      const rawUser = await authApi.me(token);
      const user: User = { ...rawUser, employeeCode: (rawUser as any).email ?? '' };
      set({ accessToken: token, user, isLoggedIn: true });
    } catch {
      await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  },
}));
