import { create } from 'zustand';
import { Store } from '../api/storeApi';

interface StoreContextState {
  selectedStore: Store | null;
  setSelectedStore: (store: Store | null) => void;
}

export const useStoreContextStore = create<StoreContextState>((set) => ({
  selectedStore: null,
  setSelectedStore: (selectedStore) => set({ selectedStore }),
}));
