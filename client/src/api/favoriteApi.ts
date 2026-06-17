import { apiClient, unwrap } from './client';

export type FavoriteTargetType = 'MENU' | 'DOCUMENT' | 'SCHEDULE' | 'CHAT_ROOM';

export interface Favorite {
  id: number;
  targetType: FavoriteTargetType;
  targetId?: number;
  targetKey?: string;
  label?: string;
  createdAt: string;
}

export interface FavoriteCreateRequest {
  targetType: FavoriteTargetType;
  targetId?: number;
  targetKey?: string;
  label?: string;
}

export const favoriteApi = {
  /** 사용자의 즐겨찾기 목록을 조회합니다. */
  getFavorites: async (): Promise<Favorite[]> => {
    const res = await apiClient.get('/api/favorites');
    return unwrap(res);
  },

  /** 즐겨찾기 항목을 추가합니다. */
  addFavorite: async (body: FavoriteCreateRequest): Promise<Favorite> => {
    const res = await apiClient.post('/api/favorites', body);
    return unwrap(res);
  },

  /** 즐겨찾기 항목을 삭제합니다. */
  removeFavorite: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/favorites/${id}`);
  },
};
