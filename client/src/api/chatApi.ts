import { apiClient, unwrap } from './client';

export type RoomType = 'GROUP' | 'DIRECT';
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE';

export interface ChatRoom {
  id: number;
  name: string;
  type: RoomType;
  storeId?: number;
  lastMessage: string;
  lastAt: string;
  unread: number;
  members: number;
}

export interface Message {
  id: number;
  roomId: number;
  senderId: number;
  senderName: string;
  content: string;
  type: MessageType;
  sentAt: string;
  isMe: boolean;
}

export interface SendMessageRequest {
  roomId: number;
  content: string;
  type: MessageType;
}

export const chatApi = {
  getRooms: async (): Promise<ChatRoom[]> => {
    const res = await apiClient.get('/api/chat/rooms');
    return unwrap(res);
  },

  getMessages: async (roomId: number, params?: { before?: number; limit?: number }): Promise<Message[]> => {
    const res = await apiClient.get(`/api/chat/rooms/${roomId}/messages`, { params });
    return unwrap(res);
  },

  /** 1:1 채팅방 생성 (점장 권한 검증은 서버에서 처리) */
  createDirectRoom: async (targetUserId: number): Promise<ChatRoom> => {
    const res = await apiClient.post('/api/chat/rooms/direct', { targetUserId });
    return unwrap(res);
  },

  /** REST fallback: STOMP 연결 불가 시 메시지 전송 */
  sendMessage: async (data: SendMessageRequest): Promise<Message> => {
    const res = await apiClient.post(`/api/chat/rooms/${data.roomId}/messages`, data);
    return unwrap(res);
  },

  markRead: async (roomId: number): Promise<void> => {
    await apiClient.post(`/api/chat/rooms/${roomId}/read`);
  },
};
