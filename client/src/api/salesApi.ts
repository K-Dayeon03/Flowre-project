import { apiClient, unwrap } from './client';

export interface SalesPeriodMetric {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  comparedToPrevious?: number | null;
}

export interface SalesSummary {
  today: SalesPeriodMetric;
  week: SalesPeriodMetric;
  month: SalesPeriodMetric;
}

export interface HourlySales {
  hour: number;
  totalRevenue: number;
  totalOrders: number;
}

export interface StoreSales {
  storeId: number;
  storeName: string;
  totalRevenue: number;
  totalOrders: number;
  comparedToPrevious?: number | null;
}

export interface SalesUploadResult {
  rowCount: number;
  skippedCount: number;
}

export const salesApi = {
  getSummary: async (params?: { storeId?: number }): Promise<SalesSummary> => {
    const res = await apiClient.get('/api/sales/summary', { params });
    return unwrap(res);
  },

  getHourly: async (params?: { storeId?: number; date?: string }): Promise<HourlySales[]> => {
    const res = await apiClient.get('/api/sales/hourly', { params });
    return unwrap(res);
  },

  getStores: async (params?: { date?: string }): Promise<StoreSales[]> => {
    const res = await apiClient.get('/api/sales/stores', { params });
    return unwrap(res);
  },

  upload: async (file: { uri: string; name: string; type: string; file?: File }): Promise<SalesUploadResult> => {
    const formData = new FormData();
    if (file.file) {
      formData.append('file', file.file, file.name);
    } else {
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as unknown as Blob);
    }
    const res = await apiClient.post('/api/sales/upload', formData);
    return unwrap(res);
  },
};

