import { create } from 'zustand';
import { inventoryApi, InventoryItem, InventoryLabel } from '../api/inventoryApi';

interface InventoryState {
  items: InventoryItem[];
  labels: InventoryLabel[];
  loading: boolean;
  error: string | null;

  fetchItems: (params?: { query?: string; archived?: boolean; labelName?: string }) => Promise<void>;
  fetchLabels: () => Promise<void>;
  archiveItem: (id: number, data: { labelName: string; archiveItemName: string; archiveQuantity: number }) => Promise<void>;
  unarchiveItem: (id: number) => Promise<void>;
  adjustItem: (item: InventoryItem, quantityChange: number, reason?: string) => Promise<void>;
  deductItem: (item: InventoryItem, quantity: number, reason?: string) => Promise<void>;
  reloadFromExcel: () => Promise<void>;
}

const mockItems: InventoryItem[] = [
  {
    id: 1,
    version: 0,
    storeId: 1,
    storeCode: '81542',
    storeName: 'FLOWRE',
    productCode: 'J1-0-4-4-01-101',
    colorCode: '48',
    colorName: 'KHAKI',
    sizeName: 'L',
    productName: '남녀공용 라이트 다운필 베스트',
    barcode: '8806077980199',
    sourceCode: '--',
    packQuantity: 1,
    normalPrice: 49900,
    retailPrice: 29900,
    quantity: 0,
    archived: false,
  },
  {
    id: 2,
    version: 0,
    storeId: 1,
    storeCode: '81542',
    storeName: 'FLOWRE',
    productCode: 'J1-0-4-4-01-102',
    colorCode: '48',
    colorName: 'KHAKI',
    sizeName: 'M',
    productName: '남녀공용 라이트 다운필 베스트',
    barcode: '8806077980205',
    sourceCode: '--',
    packQuantity: 1,
    normalPrice: 49900,
    retailPrice: 29900,
    quantity: 12,
    archived: false,
  },
];

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  labels: [{ id: 1, name: '추후 필요 재고' }],
  loading: false,
  error: null,

  fetchItems: async (params) => {
    set({ loading: true, error: null });
    try {
      if (__DEV__) {
        const query = params?.query?.trim().toLowerCase();
        const archived = params?.archived ?? false;
        const labelName = params?.labelName;
        const items = mockItems.filter((item) => {
          const matchesArchive = item.archived === archived;
          const matchesLabel = !labelName || item.archiveLabelName === labelName;
          const searchable = [
            item.storeName,
            item.storeCode,
            item.productCode,
            item.productName,
            item.barcode,
            item.colorName,
            item.sizeName,
          ].join(' ').toLowerCase();
          return matchesArchive && matchesLabel && (!query || searchable.includes(query));
        });
        set({ items });
        return;
      }
      const items = await inventoryApi.search(params);
      set({ items });
    } catch (e: any) {
      set({ error: e.message ?? '재고를 불러오지 못했습니다.' });
    } finally {
      set({ loading: false });
    }
  },

  fetchLabels: async () => {
    try {
      if (__DEV__) return;
      const labels = await inventoryApi.getLabels();
      set({ labels });
    } catch (e: any) {
      set({ error: e.message ?? '라벨을 불러오지 못했습니다.' });
    }
  },

  archiveItem: async (id, data) => {
    if (__DEV__) {
      const label = data.labelName.trim() || '추후 필요 재고';
      set((state) => ({
        labels: state.labels.some((l) => l.name === label)
          ? state.labels
          : [...state.labels, { id: Date.now(), name: label }],
        items: state.items.filter((item) => item.id !== id),
      }));
      return;
    }
    const updated = await inventoryApi.archive(id, data);
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      labels: state.labels.some((label) => label.name === updated.archiveLabelName)
        ? state.labels
        : [...state.labels, { id: Date.now(), name: updated.archiveLabelName ?? data.labelName }],
    }));
  },

  unarchiveItem: async (id) => {
    if (__DEV__) {
      set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
      return;
    }
    await inventoryApi.unarchive(id);
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
  },

  deductItem: async (item, quantity, reason) => {
    if (__DEV__) {
      set((state) => ({
        items: state.items.map((current) =>
          current.id === item.id
            ? { ...current, quantity: Math.max(0, current.quantity - quantity), version: current.version + 1 }
            : current
        ),
      }));
      return;
    }
    const updated = await inventoryApi.deduct(item.id, {
      quantity,
      version: item.version,
      reason,
    });
    set((state) => ({
      items: state.items.map((current) => (current.id === updated.id ? updated : current)),
    }));
  },

  adjustItem: async (item, quantityChange, reason) => {
    if (__DEV__) {
      set((state) => ({
        items: state.items.map((current) =>
          current.id === item.id
            ? { ...current, quantity: Math.max(0, current.quantity + quantityChange), version: current.version + 1 }
            : current
        ),
      }));
      return;
    }
    const updated = await inventoryApi.adjust(item.id, {
      quantityChange,
      version: item.version,
      reason,
    });
    set((state) => ({
      items: state.items.map((current) => (current.id === updated.id ? updated : current)),
    }));
  },

  reloadFromExcel: async () => {
    set({ loading: true, error: null });
    try {
      if (!__DEV__) {
        await inventoryApi.reload();
      }
      await get().fetchItems({ archived: false });
      await get().fetchLabels();
    } catch (e: any) {
      set({ error: e.message ?? '엑셀 재고를 다시 불러오지 못했습니다.' });
    } finally {
      set({ loading: false });
    }
  },
}));
