import { create } from 'zustand';
import { Notice, NoticeCreateRequest, noticeApi } from '../api/noticeApi';

interface NoticeState {
  notices: Notice[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotices: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  createNotice: (body: NoticeCreateRequest) => Promise<Notice>;
  updateNotice: (id: number, body: NoticeCreateRequest) => Promise<Notice>;
  deleteNotice: (id: number) => Promise<void>;
}

export const useNoticeStore = create<NoticeState>((set) => ({
  notices: [],
  unreadCount: 0,
  loading: false,
  error: null,

  fetchNotices: async () => {
    set({ loading: true, error: null });
    try {
      const notices = await noticeApi.getNotices();
      set({ notices });
    } catch (e: any) {
      set({ error: e.message ?? '공지를 불러오지 못했습니다.' });
    } finally {
      set({ loading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const unreadCount = await noticeApi.getUnreadCount();
      set({ unreadCount });
    } catch {
      set({ unreadCount: 0 });
    }
  },

  markRead: async (id) => {
    await noticeApi.markRead(id);
    set((state) => ({
      notices: state.notices.map((notice) => (notice.id === id ? { ...notice, read: true } : notice)),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  createNotice: async (body) => {
    const created = await noticeApi.createNotice(body);
    set((state) => ({ notices: [created, ...state.notices] }));
    return created;
  },

  updateNotice: async (id, body) => {
    const updated = await noticeApi.updateNotice(id, body);
    set((state) => ({
      notices: state.notices.map((n) => (n.id === id ? updated : n)),
    }));
    return updated;
  },

  deleteNotice: async (id) => {
    await noticeApi.deleteNotice(id);
    set((state) => ({
      notices: state.notices.filter((n) => n.id !== id),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },
}));
