import { apiClient, unwrap } from './client';

export type OrderStatus = 'PREPARING' | 'SHIPPING' | 'COMPLETED' | 'CANCELED';

export interface InventoryOrder {
  id: number;
  storeId: number;
  storeName: string;
  inventoryItemId: number;
  productCode: string;
  productName: string;
  currentQuantity: number;
  minQuantity: number;
  orderQuantity: number;
  unitPrice: number;
  expectedAmount: number;
  status: OrderStatus;
  requestedById: number;
  requestedByName: string;
  canceledReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderCreateRequest {
  inventoryItemId: number;
  orderQuantity: number;
  unitPrice?: number;
}

export const orderApi = {
  getOrders: async (params?: { storeId?: number; status?: OrderStatus; limit?: number }): Promise<InventoryOrder[]> => {
    const res = await apiClient.get('/api/orders', { params });
    return unwrap(res);
  },

  create: async (data: OrderCreateRequest): Promise<InventoryOrder> => {
    const res = await apiClient.post('/api/orders', data);
    return unwrap(res);
  },

  changeStatus: async (id: number, status: OrderStatus): Promise<InventoryOrder> => {
    const res = await apiClient.patch(`/api/orders/${id}/status`, { status });
    return unwrap(res);
  },

  cancel: async (id: number, reason?: string): Promise<InventoryOrder> => {
    const res = await apiClient.patch(`/api/orders/${id}/cancel`, { reason });
    return unwrap(res);
  },
};

