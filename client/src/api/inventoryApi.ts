import { apiClient, unwrap } from './client';

export interface InventoryItem {
  id: number;
  version: number;
  storeId: number;
  storeCode: string;
  storeName: string;
  productCode: string;
  colorCode?: string;
  colorName?: string;
  sizeName?: string;
  productName: string;
  /** 카테고리 코드 (예: OUTER) — 서버가 상품명 키워드로 분류해 내려준다. */
  category?: string;
  /** 카테고리 한글 라벨 (예: 아우터). */
  categoryLabel?: string;
  barcode?: string;
  sourceCode?: string;
  packQuantity?: number;
  normalPrice?: number;
  retailPrice?: number;
  quantity: number;
  archived: boolean;
  /** 보관 항목의 원본 실시간 재고 아이템 ID — 보관 해제 시 이 항목 수량 복원에 사용 */
  sourceItemId?: number;
  archiveLabelName?: string;
  /** 보관 목적/용도명 (예: "VM 스테이징") */
  archiveItemName?: string;
  archiveItemCode?: string;
  archiveQuantity?: number;
  archivedAt?: string;
  archivedBy?: string;
  updatedAt?: string;
}

/** 페이지네이션이 적용된 재고 목록 응답 */
export interface InventoryPage {
  items: InventoryItem[];
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
}

export interface InventoryLabel {
  id: number;
  name: string;
}

export interface CategoryCount {
  /** 카테고리 코드 (필터 파라미터로 사용). */
  category: string;
  /** 화면 표시용 한글 라벨. */
  label: string;
  count: number;
}

export interface InventoryTransaction {
  id: number;
  inventoryItemId: number;
  storeId: number;
  productCode: string;
  productName: string;
  quantity: number;
  remainingQuantity: number;
  reason?: string;
  usedByName: string;
  createdAt: string;
}

export interface InventoryLoadResult {
  fileCount: number;
  rowCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  /** 전체 교체 시 파일에 없어 수량을 0으로 만든 기존(비보관) 항목 수 */
  zeroedCount: number;
  fileNames: string[];
}

export const inventoryApi = {
  /**
   * 재고 목록을 페이지 단위로 검색한다. page=0부터 시작하며 한 페이지에 30건.
   */
  search: async (params?: {
    query?: string;
    storeId?: number;
    archived?: boolean;
    labelName?: string;
    category?: string;
    page?: number;
  }): Promise<InventoryPage> => {
    const res = await apiClient.get('/api/inventories', { params });
    return unwrap(res);
  },

  getCategoryCounts: async (params?: { storeId?: number; archived?: boolean }): Promise<CategoryCount[]> => {
    const res = await apiClient.get('/api/inventories/category-counts', { params });
    return unwrap(res);
  },

  getLabels: async (): Promise<InventoryLabel[]> => {
    const res = await apiClient.get('/api/inventories/labels');
    return unwrap(res);
  },

  createLabel: async (name: string): Promise<InventoryLabel> => {
    const res = await apiClient.post('/api/inventories/labels', { name });
    return unwrap(res);
  },

  archive: async (
    id: number,
    data: { labelName: string; archiveItemName: string; archiveItemCode?: string; archiveQuantity: number }
  ): Promise<InventoryItem> => {
    const res = await apiClient.patch(`/api/inventories/${id}/archive`, data);
    return unwrap(res);
  },

  unarchive: async (id: number): Promise<InventoryItem> => {
    const res = await apiClient.patch(`/api/inventories/${id}/unarchive`);
    return unwrap(res);
  },

  deduct: async (
    id: number,
    data: { quantity: number; version: number; reason?: string }
  ): Promise<InventoryItem> => {
    const res = await apiClient.post(`/api/inventories/${id}/deduct`, data);
    return unwrap(res);
  },

  adjust: async (
    id: number,
    data: { quantityChange: number; version: number; reason?: string }
  ): Promise<InventoryItem> => {
    const res = await apiClient.patch(`/api/inventories/${id}/adjust`, data);
    return unwrap(res);
  },

  getTransactions: async (): Promise<InventoryTransaction[]> => {
    const res = await apiClient.get('/api/inventories/transactions');
    return unwrap(res);
  },

  /**
   * 특정 재고 아이템 한 건의 입출고 이력을 최신순으로 조회한다.
   * @param id 재고 아이템 ID
   */
  getItemTransactions: async (id: number): Promise<InventoryTransaction[]> => {
    const res = await apiClient.get(`/api/inventories/${id}/transactions`);
    return unwrap(res);
  },

  reload: async (): Promise<InventoryLoadResult> => {
    const res = await apiClient.post('/api/inventories/reload');
    return unwrap(res);
  },

  uploadDaily: async (file: { uri: string; name: string; type: string; file?: File }): Promise<InventoryLoadResult> => {
    const formData = new FormData();
    if (file.file) {
      formData.append('file', file.file, file.name);
    } else {
      formData.append('file', file as unknown as Blob);
    }
    const res = await apiClient.post('/api/inventories/upload', formData);
    return unwrap(res);
  },
};
