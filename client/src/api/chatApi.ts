import { apiClient, unwrap } from './client';

export type RoomType = 'GROUP' | 'DIRECT';
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE';
export type UserRole = 'STORE_STAFF' | 'STORE_MANAGER' | 'HQ_STAFF' | 'ADMIN';

export interface StoreMember {
  id: number;
  name: string;
  employeeCode: string;
  role: string;
}

export interface ChatMember {
  id: number;
  name: string;
  employeeCode: string;
  role: UserRole;
  storeName?: string;
}

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
  fileName?: string;
  sentAt: string;
  isMe: boolean;
}

export interface SendMessageRequest {
  roomId: number;
  content: string;
  type: MessageType;
  fileName?: string;
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

  /** 1:n, N:1 다자 채팅방 생성 */
  createRoom: async (data: { name: string; memberUserIds: number[] }): Promise<ChatRoom> => {
    const res = await apiClient.post('/api/chat/rooms', data);
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

  /** 그룹 채팅방 이름 수정 */
  updateRoom: async (roomId: number, name: string): Promise<ChatRoom> => {
    const res = await apiClient.put(`/api/chat/rooms/${roomId}`, { name });
    return unwrap(res);
  },

  /** 채팅방 나가기 */
  leaveRoom: async (roomId: number): Promise<void> => {
    await apiClient.delete(`/api/chat/rooms/${roomId}`);
  },

  /** 같은 매장 활성 직원 목록 (채팅 대상 선택용) */
  getStoreMembers: async (): Promise<StoreMember[]> => {
    const res = await apiClient.get('/api/employees/store-members');
    return unwrap(res);
  },

  /** role 기반 채팅 가능 대상 목록 (매장 직원 + 본사 직원 통합) */
  getChatCandidates: async (): Promise<ChatMember[]> => {
    const res = await apiClient.get('/api/chat/members/candidates');
    return unwrap(res);
  },
};
