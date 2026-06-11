import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/authApi';
import { registerSessionExpiredHandler } from '../api/client';

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
  clearSession: () => Promise<void>;
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

  /**
   * 세션 강제 정리 (refresh 영구 실패 시)
   *
   * logout과 달리 서버 로그아웃 API를 호출하지 않는다. 이미 토큰이 무효화된
   * 상태이므로 인증 상태만 초기화하여 RootStack이 로그인 화면으로 전환되도록 한다.
   * AsyncStorage 토큰은 인터셉터에서 이미 제거되지만 방어적으로 한 번 더 제거한다.
   */
  clearSession: async () => {
    try {
      await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
    } catch {
      // 토큰 제거 실패는 무시 — 인증 상태 초기화가 우선
    }
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

/**
 * 세션 만료(refresh 영구 실패) 시 인증 상태를 정리하도록 client 인터셉터에
 * 핸들러를 바인딩한다. 앱 부팅 지점(App.tsx)에서 1회 명시적으로 호출한다.
 *
 * 모듈 import 부수효과에 의존하지 않고 명시적 초기화 함수로 분리한 이유:
 * 번들러 트리셰이킹·지연 로딩으로 store 모듈이 평가되지 않으면 핸들러가 조용히
 * 미등록될 수 있기 때문이다. 이벤트 기반 등록은 client.ts → store 직접 import에
 * 의한 순환 의존을 피한다.
 */
export function bindSessionExpiredHandler(): void {
  registerSessionExpiredHandler(() => {
    void useAuthStore.getState().clearSession();
  });
}
