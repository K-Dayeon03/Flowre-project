import { create } from 'zustand';
import { CategoryCount, inventoryApi, InventoryItem, InventoryLabel, InventoryLoadResult } from '../api/inventoryApi';

interface SearchParams {
  query?: string;
  archived?: boolean;
  labelName?: string;
  category?: string;
}

interface InventoryState {
  items: InventoryItem[];
  labels: InventoryLabel[];
  categoryCounts: CategoryCount[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  totalCount: number;
  hasNext: boolean;
  currentPage: number;
  lastParams: SearchParams;

  fetchItems: (params?: SearchParams) => Promise<void>;
  fetchMoreItems: () => Promise<void>;
  fetchCategoryCounts: (params?: { archived?: boolean }) => Promise<void>;
  fetchLabels: () => Promise<void>;
  archiveItem: (
    id: number,
    data: { labelName: string; archiveItemName: string; archiveItemCode?: string; archiveQuantity: number }
  ) => Promise<void>;
  unarchiveItem: (id: number) => Promise<void>;
  adjustItem: (item: InventoryItem, quantityChange: number, reason?: string) => Promise<void>;
  deductItem: (item: InventoryItem, quantity: number, reason?: string) => Promise<void>;
  uploadDailyFile: (file: { uri: string; name: string; type: string; file?: File }) => Promise<InventoryLoadResult>;
  reloadFromExcel: () => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  labels: [{ id: 1, name: '추후 필요 재고' }],
  categoryCounts: [],
  loading: false,
  loadingMore: false,
  error: null,
  totalCount: 0,
  hasNext: false,
  currentPage: 0,
  lastParams: {},

  /** 첫 페이지 재고 현황을 서버에서 조회해 목록을 갱신합니다. */
  fetchItems: async (params = {}) => {
    set({ loading: true, error: null, currentPage: 0, lastParams: params });
    try {
      const page = await inventoryApi.search({ ...params, page: 0 });
      set({ items: page.items, totalCount: page.totalCount, hasNext: page.hasNext, currentPage: 0 });
    } catch (e: any) {
      set({ error: e.message ?? '재고를 불러오지 못했습니다.' });
    } finally {
      set({ loading: false });
    }
  },

  /** 다음 페이지를 이어 붙입니다 (무한 스크롤). */
  fetchMoreItems: async () => {
    const { hasNext, loadingMore, loading, currentPage, lastParams } = get();
    if (!hasNext || loadingMore || loading) return;
    const nextPage = currentPage + 1;
    set({ loadingMore: true });
    try {
      const page = await inventoryApi.search({ ...lastParams, page: nextPage });
      set((state) => ({
        items: [...state.items, ...page.items],
        totalCount: page.totalCount,
        hasNext: page.hasNext,
        currentPage: nextPage,
      }));
    } catch (e: any) {
      set({ error: e.message ?? '추가 재고를 불러오지 못했습니다.' });
    } finally {
      set({ loadingMore: false });
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

  /** 보관 라벨 목록을 조회합니다. */
  fetchLabels: async () => {
    try {
      const labels = await inventoryApi.getLabels();
      set({ labels });
    } catch (e: any) {
      set({ error: e.message ?? '라벨을 불러오지 못했습니다.' });
    }
  },

  /**
   * 입력 수량만큼 실시간 재고에서 차감하고 보관함으로 이동합니다.
   * 서버는 수량이 차감된 원본 항목을 반환하므로, 목록의 원본을 교체합니다.
   */
  archiveItem: async (id, data) => {
    const updatedSource = await inventoryApi.archive(id, data);
    set((state) => ({
      items: state.items.map((item) => (item.id === updatedSource.id ? updatedSource : item)),
    }));
    await get().fetchLabels();
  },

  /**
   * 보관함 항목을 해제합니다. 서버에서 원본 실시간 재고에 수량을 복원합니다.
   * 보관 항목은 목록에서 제거하고, 실시간 재고 탭에서는 원본 항목의 수량이 증가합니다.
   */
  unarchiveItem: async (id) => {
    const restoredSource = await inventoryApi.unarchive(id);
    set((state) => ({
      // 보관 항목 제거
      items: state.items
        .filter((item) => item.id !== id)
        // 원본 항목이 목록에 있으면 복원된 수량으로 교체
        .map((item) => (item.id === restoredSource.id ? restoredSource : item)),
    }));
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
   * 사용자가 선택한 당일 점별 재고 xlsx 파일을 서버에 업로드해 반영한 뒤 목록을 새로고침합니다.
   * 직원·점장은 본인 매장 행만, 본사·관리자는 파일 내 전 매장이 반영됩니다.
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

  /** 서버의 data 폴더 재고를 재적재합니다 (본사·관리자 전용). */
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
