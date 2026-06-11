import { create } from 'zustand';
import { CategoryCount, inventoryApi, InventoryItem, InventoryLabel, InventoryLoadResult } from '../api/inventoryApi';

interface InventoryState {
  items: InventoryItem[];
  labels: InventoryLabel[];
  categoryCounts: CategoryCount[];
  loading: boolean;
  error: string | null;

  fetchItems: (params?: { query?: string; archived?: boolean; labelName?: string; category?: string }) => Promise<void>;
  fetchCategoryCounts: (params?: { archived?: boolean }) => Promise<void>;
  fetchLabels: () => Promise<void>;
  archiveItem: (
    id: number,
    data: { labelName: string; archiveItemName: string; archiveItemCode?: string; archiveQuantity: number }
  ) => Promise<void>;
  unarchiveItem: (id: number) => Promise<void>;
  adjustItem: (item: InventoryItem, quantityChange: number, reason?: string) => Promise<void>;
  deductItem: (item: InventoryItem, quantity: number, reason?: string) => Promise<void>;
  uploadDailyFile: (file: { uri: string; name: string; type: string }) => Promise<InventoryLoadResult>;
  reloadFromExcel: () => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  labels: [{ id: 1, name: '추후 필요 재고' }],
  categoryCounts: [],
  loading: false,
  error: null,

  /** 점별 재고 현황을 서버에서 조회해 목록을 갱신합니다. */
  fetchItems: async (params) => {
    set({ loading: true, error: null });
    try {
      const items = await inventoryApi.search(params);
      set({ items });
    } catch (e: any) {
      set({ error: e.message ?? '재고를 불러오지 못했습니다.' });
    } finally {
      set({ loading: false });
    }
  },

  /** 카테고리별 재고 건수를 조회해 칩에 표시할 카운트를 갱신합니다. */
  fetchCategoryCounts: async (params) => {
    try {
      const categoryCounts = await inventoryApi.getCategoryCounts(params);
      set({ categoryCounts });
    } catch (e: any) {
      set({ error: e.message ?? '카테고리 건수를 불러오지 못했습니다.' });
    }
  },

  /** 아카이브 라벨 목록을 조회합니다. */
  fetchLabels: async () => {
    try {
      const labels = await inventoryApi.getLabels();
      set({ labels });
    } catch (e: any) {
      set({ error: e.message ?? '라벨을 불러오지 못했습니다.' });
    }
  },

  /**
   * 입력 수량만큼 실시간 재고에서 차감하고 그 수량을 아카이브로 이동합니다.
   * 서버는 수량이 차감된 원본 항목을 반환하므로, 목록의 원본을 교체합니다.
   */
  archiveItem: async (id, data) => {
    const updatedSource = await inventoryApi.archive(id, data);
    set((state) => ({
      items: state.items.map((item) => (item.id === updatedSource.id ? updatedSource : item)),
    }));
    // 새 라벨이 생성됐을 수 있으므로 라벨 목록을 갱신한다.
    await get().fetchLabels();
  },

  /** 아카이브 항목을 실시간 재고로 되돌립니다. */
  unarchiveItem: async (id) => {
    await inventoryApi.unarchive(id);
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
  },

  /** 본사 사용분을 차감하고 서버가 반환한 항목으로 교체합니다. */
  deductItem: async (item, quantity, reason) => {
    const updated = await inventoryApi.deduct(item.id, {
      quantity,
      version: item.version,
      reason,
    });
    set((state) => ({
      items: state.items.map((current) => (current.id === updated.id ? updated : current)),
    }));
  },

  /** 실시간 재고 수량을 증감하고 서버가 반환한 항목으로 교체합니다. */
  adjustItem: async (item, quantityChange, reason) => {
    const updated = await inventoryApi.adjust(item.id, {
      quantityChange,
      version: item.version,
      reason,
    });
    set((state) => ({
      items: state.items.map((current) => (current.id === updated.id ? updated : current)),
    }));
  },

  /**
   * 사용자가 선택한 당일 점별 재고 xlsx 파일을 서버에 업로드해 전체 교체로 반영한 뒤,
   * 목록·라벨을 새로고침하고 반영 통계를 반환합니다. 직원·점장은 본인 매장 행만,
   * 본사·관리자는 파일 내 전 매장이 반영됩니다(서버 스코프 처리).
   */
  uploadDailyFile: async (file) => {
    set({ loading: true, error: null });
    try {
      const result = await inventoryApi.uploadDaily(file);
      await get().fetchItems({ archived: false });
      await get().fetchLabels();
      return result;
    } catch (e: any) {
      set({ error: e.message ?? '재고 파일을 반영하지 못했습니다.' });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  /** 서버에 data 폴더 재고 재적재를 요청한 뒤 목록·라벨을 새로고침합니다. */
  reloadFromExcel: async () => {
    set({ loading: true, error: null });
    try {
      await inventoryApi.reload();
      await get().fetchItems({ archived: false });
      await get().fetchLabels();
    } catch (e: any) {
      set({ error: e.message ?? '엑셀 재고를 다시 불러오지 못했습니다.' });
    } finally {
      set({ loading: false });
    }
  },
}));
