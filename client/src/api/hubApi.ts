import { apiClient, unwrap } from './client';

export interface HubRecentNotification {
  id: number;
  type: string;
  title: string;
  message?: string | null;
  relatedType?: string | null;
  relatedId?: number | null;
  read: boolean;
  createdAt?: string | null;
}

export interface HubRecentDocument {
  id: number;
  title: string;
  category: string;
  createdAt?: string | null;
}

export interface HubSummary {
  unreadNoticeCount: number;
  unreadChatCount: number;
  pendingScheduleCount: number;
  pendingInquiryCount: number;
  pendingAsCount: number;
  recentNotifications: HubRecentNotification[];
  recentDocuments: HubRecentDocument[];
}

export interface HubSearchResult {
  type: 'NOTICE' | 'DOCUMENT' | 'SCHEDULE';
  resourceId: number;
  title: string;
  subtitle?: string | null;
  createdAt?: string | null;
}

export const hubApi = {
  getSummary: async (): Promise<HubSummary> => {
    const res = await apiClient.get('/api/hub/summary');
    return unwrap(res);
  },

  search: async (query: string): Promise<HubSearchResult[]> => {
    const res = await apiClient.get('/api/hub/search', { params: { query } });
    return unwrap(res);
  },
};

