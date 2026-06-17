import { apiClient, unwrap } from './client';

export interface Notice {
  id: number;
  title: string;
  content?: string;
  pinned: boolean;
  authorName: string;
  read: boolean;
  createdAt: string;
}

export interface NoticeCreateRequest {
  title: string;
  content?: string;
  pinned: boolean;
}

export interface UnreadCountResponse {
  count: number;
}

export const noticeApi = {
  /** 공지 목록을 조회합니다. */
  getNotices: async (): Promise<Notice[]> => {
    const res = await apiClient.get('/api/notices');
    return unwrap(res);
  },

  /** 공지 상세를 조회합니다. */
  getNotice: async (id: number): Promise<Notice> => {
    const res = await apiClient.get(`/api/notices/${id}`);
    return unwrap(res);
  },

  /** 읽지 않은 공지 수를 조회합니다. */
  getUnreadCount: async (): Promise<number> => {
    const res = await apiClient.get('/api/notices/unread-count');
    const data = unwrap<UnreadCountResponse>(res);
    return data.count;
  },

  /** 권한자가 공지를 작성합니다. */
  createNotice: async (body: NoticeCreateRequest): Promise<Notice> => {
    const res = await apiClient.post('/api/notices', body);
    return unwrap(res);
  },

  /** 공지를 읽음 처리합니다. */
  markRead: async (id: number): Promise<void> => {
    await apiClient.post(`/api/notices/${id}/read`);
  },
};
