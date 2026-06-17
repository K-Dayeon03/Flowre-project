import { apiClient, unwrap } from './client';

export interface Store {
  id: number;
  brandId: number;
  storeCode: string;
  storeName: string;
  postalCode?: string;
  roadAddress?: string;
  jibunAddress?: string;
  detailAddress?: string;
  active: boolean;
}

export interface NearbyStore {
  storeCode: string;
  storeName: string;
  distanceMeters: number;
}

export interface StoreCreateRequest {
  storeCode: string;
  storeName: string;
  postalCode: string;
  roadAddress: string;
  jibunAddress?: string;
  detailAddress?: string;
}

export interface StoreAddressUpdateRequest {
  postalCode: string;
  roadAddress: string;
  jibunAddress?: string;
  detailAddress?: string;
}

export const storeApi = {
  getList: async (): Promise<Store[]> => {
    const res = await apiClient.get('/api/stores');
    return unwrap(res);
  },

  /** 현재 좌표 기준 가까운 매장 목록을 공개 조회합니다. */
  getNearbyStores: async (lat: number, lng: number, limit = 5): Promise<NearbyStore[]> => {
    const res = await apiClient.get('/api/stores/nearby', { params: { lat, lng, limit } });
    return unwrap(res);
  },

  create: async (data: StoreCreateRequest): Promise<Store> => {
    const res = await apiClient.post('/api/stores', data);
    return unwrap(res);
  },

  /** 기존 매장의 주소 정보를 수정합니다. (본사 전용) */
  updateAddress: async (storeId: number, data: StoreAddressUpdateRequest): Promise<Store> => {
    const res = await apiClient.patch(`/api/stores/${storeId}/address`, data);
    return unwrap(res);
  },
};
