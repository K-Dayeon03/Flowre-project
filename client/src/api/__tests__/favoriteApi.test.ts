import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import { Favorite, favoriteApi } from '../favoriteApi';

const mock = new MockAdapter(apiClient);

afterEach(() => {
  mock.reset();
});

const fakeFavorite = (overrides?: Partial<Favorite>): Favorite => ({
  id: 1,
  targetType: 'DOCUMENT',
  targetId: 10,
  label: '운영 매뉴얼',
  createdAt: '2026-06-18T09:00:00',
  ...overrides,
});

describe('favoriteApi', () => {
  it('즐겨찾기 목록을 조회한다', async () => {
    const favorites = [fakeFavorite()];
    mock.onGet('/api/favorites').reply(200, { data: favorites });

    await expect(favoriteApi.getFavorites()).resolves.toEqual(favorites);
  });

  it('즐겨찾기를 추가한다', async () => {
    const created = fakeFavorite({ targetType: 'SCHEDULE', targetId: 2, label: '오픈 준비' });
    mock.onPost('/api/favorites').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({ targetType: 'SCHEDULE', targetId: 2, label: '오픈 준비' });
      return [200, { data: created }];
    });

    const result = await favoriteApi.addFavorite({ targetType: 'SCHEDULE', targetId: 2, label: '오픈 준비' });

    expect(result).toEqual(created);
  });

  it('즐겨찾기를 삭제한다', async () => {
    mock.onDelete('/api/favorites/1').reply(200, { data: null });

    await expect(favoriteApi.removeFavorite(1)).resolves.toBeUndefined();
  });
});
