import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        const newToken: string = data.data.accessToken;
        await AsyncStorage.setItem('flowre_access_token', newToken);

        pendingQueue.forEach(({ resolve }) => resolve(newToken));
        pendingQueue = [];

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        pendingQueue.forEach(({ reject }) => reject(refreshError));
        pendingQueue = [];
        await AsyncStorage.removeItem('flowre_access_token');
        // TODO: useAuthStore.getState().logout() 호출 (순환 의존 방지를 위해 이벤트 방식 사용 권장)
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
