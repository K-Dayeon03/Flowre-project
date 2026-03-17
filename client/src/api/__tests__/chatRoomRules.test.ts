import { ChatRoom, Message, RoomType, MessageType } from '../chatApi';

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

// ── GROUP 채팅방 규칙 ─────────────────────────────────────────────
describe('GROUP 채팅방', () => {
  it('storeId 존재 (number), type = GROUP', () => {
    const room = fakeRoom({ type: 'GROUP', storeId: 10 });
    expect(room.type).toBe('GROUP');
    expect(typeof room.storeId).toBe('number');
    expect(room.storeId).toBeDefined();
  });
});

// ── DIRECT 채팅방 규칙 ────────────────────────────────────────────
describe('DIRECT 채팅방', () => {
  it('storeId = undefined, type = DIRECT', () => {
    const room = fakeRoom({ type: 'DIRECT', storeId: undefined });
    expect(room.type).toBe('DIRECT');
    expect(room.storeId).toBeUndefined();
  });
});

// ── unread 규칙 ───────────────────────────────────────────────────
describe('unread 필드', () => {
  it('number 타입이며 음수가 아님', () => {
    const room = fakeRoom({ unread: 0 });
    expect(typeof room.unread).toBe('number');
    expect(room.unread).toBeGreaterThanOrEqual(0);
  });

  it('양수 unread 값도 number 타입', () => {
    const room = fakeRoom({ unread: 42 });
    expect(typeof room.unread).toBe('number');
    expect(room.unread).toBeGreaterThanOrEqual(0);
  });
});

// ── Message.isMe 규칙 ────────────────────────────────────────────
describe('Message.isMe', () => {
  it('boolean 타입 확인 (true)', () => {
    const msg = fakeMessage({ isMe: true });
    expect(typeof msg.isMe).toBe('boolean');
    expect(msg.isMe).toBe(true);
  });

  it('boolean 타입 확인 (false)', () => {
    const msg = fakeMessage({ isMe: false });
    expect(typeof msg.isMe).toBe('boolean');
    expect(msg.isMe).toBe(false);
  });
});

// ── RoomType / MessageType 열거값 ────────────────────────────────
describe('타입 열거값 검증', () => {
  it('RoomType은 GROUP 또는 DIRECT만 허용', () => {
    const validTypes: RoomType[] = ['GROUP', 'DIRECT'];
    validTypes.forEach((t) => {
      const room = fakeRoom({ type: t });
      expect(['GROUP', 'DIRECT']).toContain(room.type);
    });
  });

  it('MessageType은 TEXT, IMAGE, FILE만 허용', () => {
    const validTypes: MessageType[] = ['TEXT', 'IMAGE', 'FILE'];
    validTypes.forEach((t) => {
      const msg = fakeMessage({ type: t });
      expect(['TEXT', 'IMAGE', 'FILE']).toContain(msg.type);
    });
  });
});
