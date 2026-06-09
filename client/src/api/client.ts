import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── 요청 인터셉터: Access Token 자동 주입 ──────────────────────────
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await AsyncStorage.getItem('flowre_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── 세션 만료 핸들러 (이벤트 기반, 순환 의존 방지) ────────────────
// refresh가 영구 실패하면 인증 store·네비게이션을 정리해야 하지만,
// client.ts에서 store를 직접 import하면 순환 의존이 발생한다.
// 따라서 store가 부팅 시 핸들러를 등록(registerSessionExpiredHandler)하고,
// 인터셉터는 등록된 핸들러를 호출만 한다.
type SessionExpiredHandler = () => void;
let sessionExpiredHandler: SessionExpiredHandler | null = null;

/**
 * 세션 만료(=refresh 영구 실패) 시 호출될 핸들러를 등록한다.
 * 일반적으로 앱 부팅 시 useAuthStore가 logout 액션을 등록한다.
 *
 * @param handler 세션 만료 시 실행할 콜백 (예: 인증 상태 초기화)
 */
export function registerSessionExpiredHandler(handler: SessionExpiredHandler): void {
  sessionExpiredHandler = handler;
}

/**
 * 등록된 세션 만료 핸들러를 안전하게 호출한다.
 * 핸들러 미등록이거나 핸들러 자체가 throw 해도 인터셉터 흐름을 깨지 않는다.
 */
function notifySessionExpired(): void {
  try {
    sessionExpiredHandler?.();
  } catch (err) {
    logger.warn('[client] 세션 만료 핸들러 실행 실패:', err);
  }
}

// ── 응답 인터셉터: 401 시 Refresh Token으로 자동 갱신 ─────────────
let isRefreshing = false;
let pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        });
      }

      isRefreshing = true;
      try {
        // Refresh Token은 HttpOnly Cookie로 전달되므로 body 불필요
        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, {}, { withCredentials: true });
        // 응답 구조 방어: data.data.accessToken 누락 시 refresh 실패로 처리
        const newToken: string | undefined = data?.data?.accessToken;
        if (!newToken) {
          throw new Error('refresh 응답에 accessToken이 없습니다');
        }
        await AsyncStorage.setItem('flowre_access_token', newToken);

        pendingQueue.forEach(({ resolve }) => resolve(newToken));
        pendingQueue = [];

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        pendingQueue.forEach(({ reject }) => reject(refreshError));
        pendingQueue = [];
        await AsyncStorage.removeItem('flowre_access_token');
        // refresh 영구 실패 → 인증 상태·네비게이션 정리 (이벤트 기반, 순환 의존 방지)
        notifySessionExpired();
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/** 공통 응답 언래핑 */
export function unwrap<T>(response: { data: { data: T } }): T {
  return response.data.data;
}
