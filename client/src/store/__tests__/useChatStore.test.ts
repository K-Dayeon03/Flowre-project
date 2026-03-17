import { chatApi, ChatRoom, Message } from '../../api/chatApi';
import { useChatStore } from '../useChatStore';

// chatApi를 mock
jest.mock('../../api/chatApi', () => ({
  chatApi: {
    getRooms: jest.fn(),
    getMessages: jest.fn(),
    createDirectRoom: jest.fn(),
    sendMessage: jest.fn(),
    markRead: jest.fn(),
  },
}));

const mockedApi = chatApi as jest.Mocked<typeof chatApi>;

// ── 테스트 헬퍼 ──────────────────────────────────────────────────
const fakeRoom = (overrides?: Partial<ChatRoom>): ChatRoom => ({
  id: 1,
  name: '강남점 그룹채팅',
  type: 'GROUP',
  storeId: 10,
  lastMessage: '안녕하세요',
  lastAt: '2026-03-17T09:00:00Z',
  unread: 3,
  members: 5,
  ...overrides,
});

const fakeMessage = (overrides?: Partial<Message>): Message => ({
  id: 100,
  roomId: 1,
  senderId: 1,
  senderName: '김민지',
  content: '테스트 메시지',
  type: 'TEXT',
  sentAt: '2026-03-17T10:00:00Z',
  isMe: true,
  ...overrides,
});

// 각 테스트 전 store & mock 초기화
beforeEach(() => {
  jest.clearAllMocks();
  useChatStore.setState({
    rooms: [],
    messages: {},
    loading: false,
  });
});

// ── 초기 상태 ─────────────────────────────────────────────────────
describe('초기 상태', () => {
  it('{ rooms: [], messages: {}, loading: false }', () => {
    const state = useChatStore.getState();
    expect(state.rooms).toEqual([]);
    expect(state.messages).toEqual({});
    expect(state.loading).toBe(false);
  });
});

// ── fetchRooms() ──────────────────────────────────────────────────
describe('fetchRooms()', () => {
  it('성공: rooms 배열 갱신, loading 복구', async () => {
    const rooms = [fakeRoom({ id: 1 }), fakeRoom({ id: 2, name: 'DM' })];
    mockedApi.getRooms.mockResolvedValue(rooms);

    const promise = useChatStore.getState().fetchRooms();
    expect(useChatStore.getState().loading).toBe(true);

    await promise;

    const state = useChatStore.getState();
    expect(state.rooms).toEqual(rooms);
    expect(state.loading).toBe(false);
  });

  it('실패: loading false 복구, rooms 유지', async () => {
    const existingRooms = [fakeRoom({ id: 1 })];
    useChatStore.setState({ rooms: existingRooms });
    mockedApi.getRooms.mockRejectedValue(new Error('네트워크 오류'));

    await useChatStore.getState().fetchRooms().catch(() => {});

    const state = useChatStore.getState();
    expect(state.loading).toBe(false);
    // rooms는 기존 값 유지 (set({ rooms })이 실행되지 않으므로)
    expect(state.rooms).toEqual(existingRooms);
  });
});

// ── fetchMessages() ───────────────────────────────────────────────
describe('fetchMessages()', () => {
  it('성공: messages[1] 세팅', async () => {
    const msgs = [fakeMessage({ id: 1 }), fakeMessage({ id: 2 })];
    mockedApi.getMessages.mockResolvedValue(msgs);

    await useChatStore.getState().fetchMessages(1);

    const state = useChatStore.getState();
    expect(state.messages[1]).toEqual(msgs);
    expect(state.loading).toBe(false);
  });

  it('두 번 호출: 두 번째 결과로 덮어쓰기', async () => {
    const first = [fakeMessage({ id: 1, content: '첫 번째' })];
    const second = [fakeMessage({ id: 2, content: '두 번째' })];

    mockedApi.getMessages.mockResolvedValueOnce(first);
    await useChatStore.getState().fetchMessages(1);
    expect(useChatStore.getState().messages[1]).toEqual(first);

    mockedApi.getMessages.mockResolvedValueOnce(second);
    await useChatStore.getState().fetchMessages(1);
    expect(useChatStore.getState().messages[1]).toEqual(second);
  });
});

// ── addMessage() ──────────────────────────────────────────────────
describe('addMessage()', () => {
  it('messages[1] 배열에 newMsg 추가', () => {
    const existingMsg = fakeMessage({ id: 1 });
    useChatStore.setState({
      rooms: [fakeRoom({ id: 1, unread: 0 })],
      messages: { 1: [existingMsg] },
    });

    const newMsg = fakeMessage({ id: 2, content: '새 메시지', sentAt: '2026-03-17T11:00:00Z' });
    useChatStore.getState().addMessage(1, newMsg);

    const state = useChatStore.getState();
    expect(state.messages[1]).toHaveLength(2);
    expect(state.messages[1][1]).toEqual(newMsg);
  });

  it('rooms에서 id=1인 방의 lastMessage, lastAt 갱신', () => {
    useChatStore.setState({
      rooms: [fakeRoom({ id: 1, lastMessage: '이전 메시지', lastAt: '2026-03-17T09:00:00Z', unread: 0 })],
      messages: { 1: [] },
    });

    const newMsg = fakeMessage({ id: 2, content: '새 메시지', sentAt: '2026-03-17T11:00:00Z' });
    useChatStore.getState().addMessage(1, newMsg);

    const room = useChatStore.getState().rooms.find((r) => r.id === 1)!;
    expect(room.lastMessage).toBe('새 메시지');
    expect(room.lastAt).toBe('2026-03-17T11:00:00Z');
  });

  it('rooms에서 id=1인 방의 unread += 1', () => {
    useChatStore.setState({
      rooms: [fakeRoom({ id: 1, unread: 5 })],
      messages: { 1: [] },
    });

    const newMsg = fakeMessage({ id: 2 });
    useChatStore.getState().addMessage(1, newMsg);

    const room = useChatStore.getState().rooms.find((r) => r.id === 1)!;
    expect(room.unread).toBe(6);
  });

  it('다른 방(id=2)은 변화 없음 (불변성)', () => {
    const room2 = fakeRoom({ id: 2, name: '다른 방', unread: 3, lastMessage: '변하면 안 됨' });
    useChatStore.setState({
      rooms: [fakeRoom({ id: 1, unread: 0 }), room2],
      messages: { 1: [], 2: [fakeMessage({ id: 10, roomId: 2 })] },
    });

    const newMsg = fakeMessage({ id: 2, content: '새 메시지' });
    useChatStore.getState().addMessage(1, newMsg);

    const state = useChatStore.getState();
    const r2 = state.rooms.find((r) => r.id === 2)!;
    expect(r2.unread).toBe(3);
    expect(r2.lastMessage).toBe('변하면 안 됨');
    // room2의 messages도 변화 없음
    expect(state.messages[2]).toHaveLength(1);
  });

  it('messages[roomId] 없을 때: 빈 배열에서 시작 (undefined 방어)', () => {
    useChatStore.setState({
      rooms: [fakeRoom({ id: 1, unread: 0 })],
      messages: {}, // roomId 1에 대한 messages가 없음
    });

    const newMsg = fakeMessage({ id: 1 });
    useChatStore.getState().addMessage(1, newMsg);

    const state = useChatStore.getState();
    expect(state.messages[1]).toHaveLength(1);
    expect(state.messages[1][0]).toEqual(newMsg);
  });
});

// ── markRoomRead() ────────────────────────────────────────────────
describe('markRoomRead()', () => {
  it('id=1 방의 unread = 0', () => {
    useChatStore.setState({
      rooms: [fakeRoom({ id: 1, unread: 10 })],
    });

    useChatStore.getState().markRoomRead(1);

    const room = useChatStore.getState().rooms.find((r) => r.id === 1)!;
    expect(room.unread).toBe(0);
  });

  it('다른 방 unread 변화 없음', () => {
    useChatStore.setState({
      rooms: [fakeRoom({ id: 1, unread: 10 }), fakeRoom({ id: 2, unread: 7 })],
    });

    useChatStore.getState().markRoomRead(1);

    const state = useChatStore.getState();
    expect(state.rooms.find((r) => r.id === 1)!.unread).toBe(0);
    expect(state.rooms.find((r) => r.id === 2)!.unread).toBe(7);
  });
});
