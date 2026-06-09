import { apiClient, unwrap } from './client';

export interface Store {
  id: number;
  brandId: number;
  storeCode: string;
  storeName: string;
  active: boolean;
}

export const storeApi = {
  getList: async (): Promise<Store[]> => {
    const res = await apiClient.get('/api/stores');
    return unwrap(res);
  },

  create: async (data: { storeCode: string; storeName: string }): Promise<Store> => {
    const res = await apiClient.post('/api/stores', data);
    return unwrap(res);
  },
};
