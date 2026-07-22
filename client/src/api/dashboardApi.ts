import { apiClient, unwrap } from './client';

export interface HomeInquiry {
  id: number;
  storeName: string;
  requesterName: string;
  title: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
  createdAt: string;
}

export interface HomeAsStatus {
  newCount: number;
  inProgressCount: number;
  doneCount: number;
  urgentCount: number;
  completionRate: number;
  updatedAt: string;
}

export interface HomeDashboardResponse {
  recentInquiries: HomeInquiry[];
  asStatus: HomeAsStatus;
}

export const dashboardApi = {
  /** 홈 대시보드 요약 정보를 조회합니다. */
  getHome: async (limit = 3): Promise<HomeDashboardResponse> => {
    const res = await apiClient.get('/api/dashboard/home', { params: { limit } });
    return unwrap(res);
  },
};
