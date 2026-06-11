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
  barcode?: string;
  sourceCode?: string;
  packQuantity?: number;
  normalPrice?: number;
  retailPrice?: number;
  quantity: number;
  archived: boolean;
  archiveLabelName?: string;
  archiveItemName?: string;
  archiveItemCode?: string;
  archiveQuantity?: number;
  archivedAt?: string;
  archivedBy?: string;
  updatedAt?: string;
}

export interface InventoryLabel {
  id: number;
  name: string;
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
  search: async (params?: {
    query?: string;
    storeId?: number;
    archived?: boolean;
    labelName?: string;
  }): Promise<InventoryItem[]> => {
    const res = await apiClient.get('/api/inventories', { params });
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

  reload: async (): Promise<InventoryLoadResult> => {
    const res = await apiClient.post('/api/inventories/reload');
    return unwrap(res);
  },

  uploadDaily: async (file: { uri: string; name: string; type: string }): Promise<InventoryLoadResult> => {
    const formData = new FormData();
    formData.append('file', file as unknown as Blob);
    const res = await apiClient.post('/api/inventories/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap(res);
  },
};
