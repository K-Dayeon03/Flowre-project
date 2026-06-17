import { create } from 'zustand';
import { Favorite, FavoriteCreateRequest, favoriteApi } from '../api/favoriteApi';

interface FavoriteState {
  favorites: Favorite[];
  loading: boolean;
  fetchFavorites: () => Promise<void>;
  add: (body: FavoriteCreateRequest) => Promise<Favorite>;
  remove: (id: number) => Promise<void>;
  findFavorite: (targetType: Favorite['targetType'], targetId?: number, targetKey?: string) => Favorite | undefined;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favorites: [],
  loading: false,

  fetchFavorites: async () => {
    set({ loading: true });
    try {
      const favorites = await favoriteApi.getFavorites();
      set({ favorites });
    } catch {
      set({ favorites: [] });
    } finally {
      set({ loading: false });
    }
  },

  add: async (body) => {
    const created = await favoriteApi.addFavorite(body);
    set((state) => ({ favorites: [created, ...state.favorites.filter((item) => item.id !== created.id)] }));
    return created;
  },

  remove: async (id) => {
    await favoriteApi.removeFavorite(id);
    set((state) => ({ favorites: state.favorites.filter((item) => item.id !== id) }));
  },

  findFavorite: (targetType, targetId, targetKey) => {
    return get().favorites.find((item) => {
      if (item.targetType !== targetType) return false;
      if (targetId != null && item.targetId === targetId) return true;
      if (targetKey && item.targetKey === targetKey) return true;
      return false;
    });
  },
}));
