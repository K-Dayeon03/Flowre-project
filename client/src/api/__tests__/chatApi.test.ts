import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import { chatApi, ChatRoom, Message, SendMessageRequest } from '../chatApi';

const mock = new MockAdapter(apiClient);

afterEach(() => {
  mock.reset();
});

// ── 테스트 헬퍼 ──────────────────────────────────────────────────
const fakeRoom = (overrides?: Partial<ChatRoom>): ChatRoom => ({
  id: 1,
  name: '강남점 그룹채팅',
  type: 'GROUP',
  storeId: 10,
  lastMessage: '안녕하세요',
  lastAt: '2026-03-17T09:00:00Z',
  unread: 0,
  members: 5,
  ...overrides,
});

const fakeMessage = (overrides?: Partial<Message>): Message => ({
  id: 100,
  roomId: 1,
  senderId: 1,
  senderName: '김민지',
  content: '안녕하세요',
  type: 'TEXT',
  sentAt: '2026-03-17T09:00:00Z',
  isMe: true,
  ...overrides,
});

// ── getRooms() ────────────────────────────────────────────────────
describe('chatApi.getRooms()', () => {
  it('GET /api/chat/rooms → ChatRoom[] 반환', async () => {
    const rooms = [fakeRoom(), fakeRoom({ id: 2, name: 'DM', type: 'DIRECT', storeId: undefined })];
    mock.onGet('/api/chat/rooms').reply(200, { data: rooms });

    const result = await chatApi.getRooms();
    expect(result).toEqual(rooms);
    expect(result).toHaveLength(2);
  });
});

// ── getMessages() ─────────────────────────────────────────────────
describe('chatApi.getMessages()', () => {
  it('GET /api/chat/rooms/1/messages 경로 확인', async () => {
    const msgs = [fakeMessage()];
    mock.onGet('/api/chat/rooms/1/messages').reply(200, { data: msgs });

    const result = await chatApi.getMessages(1);
    expect(result).toEqual(msgs);
  });

  it('before, limit 쿼리 파라미터 포함', async () => {
    mock
      .onGet('/api/chat/rooms/1/messages', { params: { before: 50, limit: 20 } })
      .reply(200, { data: [fakeMessage()] });

    const result = await chatApi.getMessages(1, { before: 50, limit: 20 });
    expect(result).toHaveLength(1);
  });

  it('빈 params 시 정상 처리', async () => {
    mock.onGet('/api/chat/rooms/1/messages').reply(200, { data: [] });

    const result = await chatApi.getMessages(1, {});
    expect(result).toEqual([]);
  });
});

// ── createDirectRoom() ───────────────────────────────────────────
describe('chatApi.createDirectRoom()', () => {
  it('POST /api/chat/rooms/direct, body: { targetUserId: 42 }', async () => {
    const room = fakeRoom({ id: 3, name: 'DM', type: 'DIRECT', storeId: undefined });

    mock.onPost('/api/chat/rooms/direct').reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.targetUserId).toBe(42);
      return [201, { data: room }];
    });

    const result = await chatApi.createDirectRoom(42);
    expect(result).toEqual(room);
  });

  it('서버 403 응답 (권한 없음): 에러 throw', async () => {
    mock.onPost('/api/chat/rooms/direct').reply(403, { message: '권한이 없습니다' });

    await expect(chatApi.createDirectRoom(42)).rejects.toThrow();
  });
});

// ── sendMessage() ─────────────────────────────────────────────────
describe('chatApi.sendMessage()', () => {
  it('POST /api/chat/rooms/1/messages, body 검증 (TEXT)', async () => {
    const req: SendMessageRequest = { roomId: 1, content: '안녕', type: 'TEXT' };
    const msg = fakeMessage({ content: '안녕' });

    mock.onPost('/api/chat/rooms/1/messages').reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.roomId).toBe(1);
      expect(body.content).toBe('안녕');
      expect(body.type).toBe('TEXT');
      return [200, { data: msg }];
    });

    const result = await chatApi.sendMessage(req);
    expect(result).toEqual(msg);
  });

  it('type IMAGE: 경로와 type 필드 확인', async () => {
    const req: SendMessageRequest = { roomId: 1, content: 'https://img.url/a.png', type: 'IMAGE' };
    const msg = fakeMessage({ content: 'https://img.url/a.png', type: 'IMAGE' });

    mock.onPost('/api/chat/rooms/1/messages').reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.type).toBe('IMAGE');
      return [200, { data: msg }];
    });

    const result = await chatApi.sendMessage(req);
    expect(result.type).toBe('IMAGE');
  });
});

// ── markRead() ────────────────────────────────────────────────────
describe('chatApi.markRead()', () => {
  it('POST /api/chat/rooms/1/read 호출', async () => {
    mock.onPost('/api/chat/rooms/1/read').reply(200);

    await expect(chatApi.markRead(1)).resolves.toBeUndefined();
  });
});
