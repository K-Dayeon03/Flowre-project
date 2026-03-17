import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../../api/authApi';
import { useAuthStore } from '../useAuthStore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = global as any;

// authApi를 mock
jest.mock('../../api/authApi', () => ({
  authApi: {
    login: jest.fn(),
    logout: jest.fn(),
    me: jest.fn(),
    refresh: jest.fn(),
  },
}));

const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;
const ACCESS_TOKEN_KEY = 'flowre_access_token';

// zustand store를 각 테스트마다 초기화
beforeEach(() => {
  (AsyncStorage.getItem as jest.Mock).mockReset();
  (AsyncStorage.setItem as jest.Mock).mockReset();
  (AsyncStorage.removeItem as jest.Mock).mockReset();
  mockedAuthApi.login.mockReset();
  mockedAuthApi.logout.mockReset();
  mockedAuthApi.me.mockReset();

  // store 상태 초기화
  useAuthStore.setState({
    user: null,
    accessToken: null,
    isLoggedIn: false,
    loading: false,
  });
});

// ── 초기 상태 ─────────────────────────────────────────────────────
describe('초기 상태', () => {
  it('{ user: null, accessToken: null, isLoggedIn: false, loading: false }', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isLoggedIn).toBe(false);
    expect(state.loading).toBe(false);
  });
});

// ── login() ───────────────────────────────────────────────────────
describe('login()', () => {
  it('production 모드: user, accessToken 세팅 + AsyncStorage 저장', async () => {
    const originalDev = g.__DEV__;
    g.__DEV__ = false;

    const mockUser = {
      id: 1,
      email: 'test@test.com',
      name: '테스트',
      role: 'STORE_STAFF' as const,
      brandId: 1,
      storeId: 1,
      storeName: '강남점',
    };

    mockedAuthApi.login.mockResolvedValue({
      accessToken: 'prod-token',
      user: mockUser,
    });

    await useAuthStore.getState().login('test@test.com', 'pass');

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('prod-token');
    expect(state.user).toEqual(mockUser);
    expect(state.isLoggedIn).toBe(true);
    expect(state.loading).toBe(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(ACCESS_TOKEN_KEY, 'prod-token');

    g.__DEV__ = originalDev;
  });

  it('DEV 모드: mockUser 반환 + dev-token 저장', async () => {
    const originalDev = g.__DEV__;
    g.__DEV__ = true;

    await useAuthStore.getState().login('any@email.com', 'any');

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('dev-token');
    expect(state.user).not.toBeNull();
    expect(state.user!.name).toBe('김민지');
    expect(state.user!.role).toBe('STORE_MANAGER');
    expect(state.isLoggedIn).toBe(true);
    expect(state.loading).toBe(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(ACCESS_TOKEN_KEY, 'dev-token');

    // DEV 모드에서는 authApi.login()이 호출되지 않아야 함
    expect(mockedAuthApi.login).not.toHaveBeenCalled();

    g.__DEV__ = originalDev;
  });

  it('실패: loading false 복구 확인', async () => {
    const originalDev = g.__DEV__;
    g.__DEV__ = false;

    mockedAuthApi.login.mockRejectedValue(new Error('Login failed'));

    await expect(useAuthStore.getState().login('test@test.com', 'bad')).rejects.toThrow(
      'Login failed'
    );

    const state = useAuthStore.getState();
    expect(state.loading).toBe(false);
    expect(state.isLoggedIn).toBe(false);
    expect(state.user).toBeNull();

    g.__DEV__ = originalDev;
  });
});

// ── logout() ──────────────────────────────────────────────────────
describe('logout()', () => {
  it('상태 초기화 + AsyncStorage 삭제', async () => {
    // 먼저 로그인 상태로 만들기
    useAuthStore.setState({
      user: { id: 1, email: 'a@b.com', name: 'T', role: 'ADMIN', brandId: 1, storeId: 1, storeName: 'S' },
      accessToken: 'token',
      isLoggedIn: true,
    });

    mockedAuthApi.logout.mockResolvedValue(undefined);

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isLoggedIn).toBe(false);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(ACCESS_TOKEN_KEY);
  });

  it('authApi.logout() 실패해도 상태는 초기화됨', async () => {
    useAuthStore.setState({
      user: { id: 1, email: 'a@b.com', name: 'T', role: 'ADMIN', brandId: 1, storeId: 1, storeName: 'S' },
      accessToken: 'token',
      isLoggedIn: true,
    });

    mockedAuthApi.logout.mockRejectedValue(new Error('Network Error'));

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoggedIn).toBe(false);
  });
});

// ── setTokens() ───────────────────────────────────────────────────
describe('setTokens()', () => {
  it('accessToken 업데이트 + AsyncStorage 저장', () => {
    useAuthStore.getState().setTokens('new-access-token');

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('new-access-token');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(ACCESS_TOKEN_KEY, 'new-access-token');
  });
});

// ── restoreSession() ──────────────────────────────────────────────
describe('restoreSession()', () => {
  it('성공: 토큰 존재 → me() 호출 → 상태 복원', async () => {
    const mockUser = {
      id: 1,
      email: 'test@test.com',
      name: '테스트',
      role: 'STORE_STAFF' as const,
      brandId: 1,
      storeId: 1,
      storeName: '강남점',
    };

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('saved-token');
    mockedAuthApi.me.mockResolvedValue(mockUser);

    await useAuthStore.getState().restoreSession();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('saved-token');
    expect(state.user).toEqual(mockUser);
    expect(state.isLoggedIn).toBe(true);
    expect(mockedAuthApi.me).toHaveBeenCalledWith('saved-token');
  });

  it('토큰 없음 → 아무것도 하지 않음', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    await useAuthStore.getState().restoreSession();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoggedIn).toBe(false);
    expect(mockedAuthApi.me).not.toHaveBeenCalled();
  });

  it('실패: 토큰 만료 → AsyncStorage 삭제, 상태는 로그아웃 유지', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('expired-token');
    mockedAuthApi.me.mockRejectedValue(new Error('Token expired'));

    await useAuthStore.getState().restoreSession();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoggedIn).toBe(false);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(ACCESS_TOKEN_KEY);
  });
});
