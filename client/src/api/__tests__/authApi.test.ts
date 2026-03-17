import MockAdapter from 'axios-mock-adapter';
import { apiClient, unwrap } from '../client';
import { authApi } from '../authApi';

const mock = new MockAdapter(apiClient);

afterEach(() => {
  mock.reset();
});

// ── unwrap() 헬퍼 ────────────────────────────────────────────────
describe('unwrap()', () => {
  it('data.data 경로를 정상적으로 언래핑한다', () => {
    const response = { data: { data: { id: 1, name: 'test' } } };
    expect(unwrap(response)).toEqual({ id: 1, name: 'test' });
  });
});

// ── authApi.login() ───────────────────────────────────────────────
describe('authApi.login()', () => {
  it('올바른 이메일/비밀번호 → accessToken + user 반환', async () => {
    const mockResponse = {
      data: {
        accessToken: 'abc123',
        user: {
          id: 1,
          email: 'test@test.com',
          name: '테스트',
          role: 'STORE_STAFF',
          brandId: 1,
          storeId: 1,
          storeName: '강남점',
        },
      },
    };
    mock.onPost('/api/auth/login').reply(200, mockResponse);

    const result = await authApi.login('test@test.com', 'password123');
    expect(result).toEqual(mockResponse.data);
    expect(result.accessToken).toBe('abc123');
    expect(result.user.email).toBe('test@test.com');
  });

  it('잘못된 비밀번호 → 에러 throw', async () => {
    mock.onPost('/api/auth/login').reply(401, { message: 'Invalid credentials' });

    await expect(authApi.login('test@test.com', 'wrong')).rejects.toThrow();
  });
});

// ── authApi.logout() ──────────────────────────────────────────────
describe('authApi.logout()', () => {
  it('POST /api/auth/logout 호출 성공', async () => {
    mock.onPost('/api/auth/logout').reply(200);

    await expect(authApi.logout()).resolves.toBeUndefined();
  });
});

// ── authApi.me() ──────────────────────────────────────────────────
describe('authApi.me()', () => {
  it('Bearer 토큰 헤더 포함 확인', async () => {
    const mockUser = {
      data: {
        id: 1,
        email: 'test@test.com',
        name: '테스트',
        role: 'STORE_STAFF',
        brandId: 1,
        storeId: 1,
        storeName: '강남점',
      },
    };
    mock.onGet('/api/auth/me').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer my-token');
      return [200, mockUser];
    });

    const result = await authApi.me('my-token');
    expect(result.email).toBe('test@test.com');
  });

  it('401 응답 → 에러 throw', async () => {
    // 401 refresh도 실패하도록 설정 (인터셉터가 refresh 시도함)
    mock.onGet('/api/auth/me').reply(401, { message: 'Unauthorized' });
    // refresh도 실패해야 최종 에러가 throw됨
    mock.onPost('/api/auth/refresh').reply(401);

    await expect(authApi.me('expired-token')).rejects.toThrow();
  });
});

// ── authApi.refresh() ─────────────────────────────────────────────
describe('authApi.refresh()', () => {
  it('withCredentials: true 포함 확인', async () => {
    mock.onPost('/api/auth/refresh').reply((config) => {
      expect(config.withCredentials).toBe(true);
      return [200, { data: { accessToken: 'new-token' } }];
    });

    const result = await authApi.refresh();
    expect(result.accessToken).toBe('new-token');
  });
});
