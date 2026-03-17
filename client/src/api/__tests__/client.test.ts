import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import AsyncStorage from '@react-native-async-storage/async-storage';

// client.ts를 매 테스트마다 새로 불러오면 인터셉터 중복 등록 문제가 있으므로
// 모듈 레벨에서 한 번만 import
import { apiClient } from '../client';

const mock = new MockAdapter(apiClient);

// axios.post (refresh 호출)도 mock 필요 — client.ts 인터셉터가 직접 axios.post 사용
jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return {
    ...actual,
    __esModule: true,
    default: {
      ...actual,
      create: actual.create,
      post: jest.fn(),
    },
  };
});

const mockedAxiosPost = axios.post as jest.MockedFunction<typeof axios.post>;

beforeEach(() => {
  mock.reset();
  (AsyncStorage.getItem as jest.Mock).mockReset();
  (AsyncStorage.setItem as jest.Mock).mockReset();
  (AsyncStorage.removeItem as jest.Mock).mockReset();
  mockedAxiosPost.mockReset();
});

// ── 요청 인터셉터 ────────────────────────────────────────────────
describe('요청 인터셉터', () => {
  it('AsyncStorage에 토큰이 있으면 Authorization 헤더에 자동 주입', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('stored-token');
    mock.onGet('/api/test').reply(200, { ok: true });

    const res = await apiClient.get('/api/test');
    expect(res.config.headers.Authorization).toBe('Bearer stored-token');
  });

  it('토큰이 없으면 Authorization 헤더 미포함', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    mock.onGet('/api/test').reply(200, { ok: true });

    const res = await apiClient.get('/api/test');
    // Authorization이 undefined이거나 존재하지 않아야 함
    expect(res.config.headers.Authorization).toBeUndefined();
  });
});

// ── 응답 인터셉터 ────────────────────────────────────────────────
describe('응답 인터셉터', () => {
  it('비-401 에러: 그대로 reject', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token');
    mock.onGet('/api/test').reply(500, { message: 'Server Error' });

    await expect(apiClient.get('/api/test')).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it('401 → refresh 성공 → 원래 요청 재시도', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('old-token');

    // 첫 요청: 401
    // 재시도 요청: 200
    let callCount = 0;
    mock.onGet('/api/protected').reply(() => {
      callCount++;
      if (callCount === 1) return [401, { message: 'Unauthorized' }];
      return [200, { data: 'success' }];
    });

    // refresh 성공
    mockedAxiosPost.mockResolvedValueOnce({
      data: { data: { accessToken: 'new-token' } },
    });

    const res = await apiClient.get('/api/protected');
    expect(res.data).toEqual({ data: 'success' });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('flowre_access_token', 'new-token');
  });

  it('401 → refresh 실패 → AsyncStorage 토큰 삭제 후 에러', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('old-token');
    mock.onGet('/api/protected').reply(401, { message: 'Unauthorized' });

    // refresh 실패
    mockedAxiosPost.mockRejectedValueOnce(new Error('Refresh failed'));

    await expect(apiClient.get('/api/protected')).rejects.toThrow('Refresh failed');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('flowre_access_token');
  });

  it('동시 401 응답: pendingQueue로 refresh 1회만 호출 (race condition 방지)', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('old-token');

    // 모든 요청이 처음엔 401, 재시도 시 200
    const callCounts: Record<string, number> = {};
    ['/api/a', '/api/b', '/api/c'].forEach((url) => {
      callCounts[url] = 0;
      mock.onGet(url).reply(() => {
        callCounts[url]++;
        if (callCounts[url] === 1) return [401, {}];
        return [200, { data: url }];
      });
    });

    // refresh는 약간의 지연 후 성공 (동시성 시뮬레이션)
    mockedAxiosPost.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: { data: { accessToken: 'refreshed-token' } } }), 50)
        )
    );

    const [resA, resB, resC] = await Promise.all([
      apiClient.get('/api/a'),
      apiClient.get('/api/b'),
      apiClient.get('/api/c'),
    ]);

    expect(resA.data).toEqual({ data: '/api/a' });
    expect(resB.data).toEqual({ data: '/api/b' });
    expect(resC.data).toEqual({ data: '/api/c' });

    // refresh는 정확히 1회만 호출되어야 함
    expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
  });
});
