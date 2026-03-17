import { create } from 'zustand';
import { chatApi, ChatRoom, Message } from '../api/chatApi';

interface ChatState {
  rooms: ChatRoom[];
  // roomId → Message[]
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
    set({ loading: true });
    try {
      const rooms = await chatApi.getRooms();
      set({ rooms });
    } finally {
      set({ loading: false });
    }
  },

  fetchMessages: async (roomId) => {
    set({ loading: true });
    try {
      const msgs = await chatApi.getMessages(roomId);
      set((state) => ({
        messages: { ...state.messages, [roomId]: msgs },
      }));
    } finally {
      set({ loading: false });
    }
  },

  /** STOMP 수신 메시지를 store에 즉시 반영 */
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

  /** 채팅방 입장 시 unread 초기화 */
  markRoomRead: (roomId) => {
    set((state) => ({
      rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, unread: 0 } : r)),
    }));
  },
}));
