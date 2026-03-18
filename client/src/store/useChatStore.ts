import { create } from 'zustand';
import { chatApi, ChatRoom, Message } from '../api/chatApi';

interface ChatState {
  rooms: ChatRoom[];
  messages: Record<number, Message[]>;
  loading: boolean;

  fetchRooms: () => Promise<void>;
  fetchMessages: (roomId: number) => Promise<void>;
  addMessage: (roomId: number, message: Message) => void;
  markRoomRead: (roomId: number) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  rooms: [],
  messages: {},
  loading: false,

  fetchRooms: async () => {
    if (__DEV__) return;
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
    if (__DEV__) {
      set((state) => ({
        messages: { ...state.messages, [roomId]: state.messages[roomId] ?? [] },
      }));
      return;
    }
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

  markRoomRead: (roomId) => {
    set((state) => ({
      rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, unread: 0 } : r)),
    }));
  },
}));
