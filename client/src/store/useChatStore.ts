import { create } from 'zustand';
import { chatApi, ChatRoom, Message } from '../api/chatApi';
import { logger } from '../utils/logger';

interface ChatState {
  rooms: ChatRoom[];
  messages: Record<number, Message[]>;
  loading: boolean;

  fetchRooms: () => Promise<void>;
  fetchMessages: (roomId: number) => Promise<void>;
  addMessage: (roomId: number, message: Message) => void;
  markRoomRead: (roomId: number) => Promise<void>;
}

export const useChatStore = create<ChatState>((set) => ({
  rooms: [],
  messages: {},
  loading: false,

  fetchRooms: async () => {
    set({ loading: true });
    try {
      const rooms = await chatApi.getRooms();
      set({ rooms });
    } catch {}
    finally {
      set({ loading: false });
    }
  },

  fetchMessages: async (roomId) => {
    set({ loading: true });
    try {
      const msgs = await chatApi.getMessages(roomId);
      set((state) => ({ messages: { ...state.messages, [roomId]: msgs } }));
    } catch {
      set((state) => ({ messages: { ...state.messages, [roomId]: [] } }));
    } finally {
      set({ loading: false });
    }
  },

  addMessage: (roomId, message) => {
    set((state) => {
      const prev = state.messages[roomId] ?? [];
      const updatedRooms = state.rooms.map((r) =>
        r.id === roomId
          ? { ...r, lastMessage: message.content, lastAt: message.sentAt, unread: r.unread + 1 }
          : r
      );
      return {
        messages: { ...state.messages, [roomId]: [...prev, message] },
        rooms: updatedRooms,
      };
    });
  },

  /**
   * 채팅방 읽음 처리
   *
   * 로컬 상태(unread=0)를 먼저 낙관적으로 갱신한 뒤, 서버에도 읽음 처리를
   * 동기화한다. 재시작·타 기기에서도 unread가 반영되도록 서버 호출이 필요하다.
   * 서버 호출 실패 시에도 로컬 상태는 유지하며 앱이 깨지지 않도록 에러를 흡수한다.
   *
   * @param roomId 읽음 처리할 채팅방 ID
   */
  markRoomRead: async (roomId) => {
    // 1) 로컬 상태 낙관적 갱신
    set((state) => ({
      rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, unread: 0 } : r)),
    }));

    // 2) 서버 동기화
    try {
      await chatApi.markRead(roomId);
    } catch (err) {
      // 서버 동기화 실패 시 로컬 상태는 그대로 두고 경고만 남긴다.
      logger.warn('[Chat] markRead 서버 동기화 실패:', err);
    }
  },
}));
