// ── @stomp/stompjs 모킹 ──────────────────────────────────────────
const mockSubscribe = jest.fn().mockReturnValue({ unsubscribe: jest.fn() });
const mockPublish = jest.fn();
const mockActivate = jest.fn();
const mockDeactivate = jest.fn();

let capturedConfig: any = {};

jest.mock('@stomp/stompjs', () => ({
  Client: jest.fn().mockImplementation((config: any) => {
    capturedConfig = config;
    return {
      activate: mockActivate,
      deactivate: mockDeactivate,
      subscribe: mockSubscribe,
      publish: mockPublish,
      connected: true,
    };
  }),
}));

// ── useAuthStore 모킹 ────────────────────────────────────────────
let mockAccessToken: string | null = 'dev-token';
jest.mock('../../store/useAuthStore', () => ({
  useAuthStore: (selector: any) => selector({ accessToken: mockAccessToken }),
}));

// ── useChatStore 모킹 ────────────────────────────────────────────
const mockAddMessage = jest.fn();
const mockMarkRoomRead = jest.fn();
jest.mock('../../store/useChatStore', () => ({
  useChatStore: (selector: any) =>
    selector({ addMessage: mockAddMessage, markRoomRead: mockMarkRoomRead }),
}));

import React from 'react';
import { Client } from '@stomp/stompjs';

// react-test-renderer에 @types가 없으므로 require 사용
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ReactTestRenderer = require('react-test-renderer');
const { act, create } = ReactTestRenderer;

// useStompChat import는 mock 이후에 해야 함
import { useStompChat } from '../useStompChat';

// ── 커스텀 renderHook (react-test-renderer 기반) ─────────────────
function renderHook<T>(hookFn: () => T) {
  const result = { current: null as T };

  function TestComponent() {
    result.current = hookFn();
    return null;
  }

  let renderer: any;
  act(() => {
    renderer = create(React.createElement(TestComponent));
  });

  return {
    result,
    unmount: () => {
      act(() => {
        renderer.unmount();
      });
    },
    rerender: () => {
      act(() => {
        renderer.update(React.createElement(TestComponent));
      });
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAccessToken = 'dev-token';
  capturedConfig = {};
});

// ── 마운트 & 연결 ────────────────────────────────────────────────
describe('마운트 & 연결', () => {
  it('마운트 시 Client.activate() 호출', () => {
    renderHook(() => useStompChat(1));

    expect(Client).toHaveBeenCalledTimes(1);
    expect(mockActivate).toHaveBeenCalledTimes(1);
  });

  it('connectHeaders에 Bearer dev-token 포함', () => {
    renderHook(() => useStompChat(1));

    expect(capturedConfig.connectHeaders).toEqual({
      Authorization: 'Bearer dev-token',
    });
  });

  it('accessToken 없을 때: Client 생성 안 됨 (early return)', () => {
    mockAccessToken = null;
    renderHook(() => useStompChat(1));

    expect(Client).not.toHaveBeenCalled();
    expect(mockActivate).not.toHaveBeenCalled();
  });
});

// ── onConnect ─────────────────────────────────────────────────────
describe('onConnect', () => {
  it('subscribe(/topic/room.{roomId}) 호출', () => {
    renderHook(() => useStompChat(5));

    // onConnect 콜백 수동 트리거
    act(() => {
      capturedConfig.onConnect();
    });

    expect(mockSubscribe).toHaveBeenCalledWith(
      '/topic/room.5',
      expect.any(Function)
    );
  });

  it('markRoomRead(roomId) 호출', () => {
    renderHook(() => useStompChat(5));

    act(() => {
      capturedConfig.onConnect();
    });

    expect(mockMarkRoomRead).toHaveBeenCalledWith(5);
  });
});

// ── onMessage ─────────────────────────────────────────────────────
describe('onMessage', () => {
  it('수신 시 addMessage(roomId, parsedMessage) 호출', () => {
    renderHook(() => useStompChat(3));

    // onConnect를 트리거하여 subscribe 콜백 확보
    act(() => {
      capturedConfig.onConnect();
    });

    // subscribe에 전달된 onMessage 콜백 가져오기
    const onMessageCallback = mockSubscribe.mock.calls[0][1];
    const fakeFrame = {
      body: JSON.stringify({
        id: 1,
        roomId: 3,
        senderId: 2,
        senderName: '이수진',
        content: '테스트',
        type: 'TEXT',
        sentAt: '2026-03-17T10:00:00Z',
        isMe: false,
      }),
    };

    act(() => {
      onMessageCallback(fakeFrame);
    });

    expect(mockAddMessage).toHaveBeenCalledWith(3, {
      id: 1,
      roomId: 3,
      senderId: 2,
      senderName: '이수진',
      content: '테스트',
      type: 'TEXT',
      sentAt: '2026-03-17T10:00:00Z',
      isMe: false,
    });
  });
});

// ── sendMessage ───────────────────────────────────────────────────
describe('sendMessage()', () => {
  it('connected: true → publish 호출, destination 및 body 확인', () => {
    const { result } = renderHook(() => useStompChat(1));

    act(() => {
      result.current.sendMessage('안녕');
    });

    expect(mockPublish).toHaveBeenCalledWith({
      destination: '/app/chat.send',
      body: JSON.stringify({ roomId: 1, content: '안녕', type: 'TEXT' }),
    });
  });

  it('connected: false → publish 호출 안 됨, console.warn 호출', () => {
    // connected를 false로 변경하기 위해 Client mock 재설정
    (Client as jest.Mock).mockImplementationOnce((config: any) => {
      capturedConfig = config;
      return {
        activate: mockActivate,
        deactivate: mockDeactivate,
        subscribe: mockSubscribe,
        publish: mockPublish,
        connected: false,
      };
    });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useStompChat(1));

    act(() => {
      result.current.sendMessage('안녕');
    });

    expect(mockPublish).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('연결되지 않음'));

    warnSpy.mockRestore();
  });
});

// ── unmount / cleanup ─────────────────────────────────────────────
describe('unmount (cleanup)', () => {
  it('subscription.unsubscribe() 및 client.deactivate() 호출', () => {
    const mockUnsubscribe = jest.fn();
    mockSubscribe.mockReturnValueOnce({ unsubscribe: mockUnsubscribe });

    const { unmount } = renderHook(() => useStompChat(1));

    // onConnect 트리거 → subscriptionRef 설정
    act(() => {
      capturedConfig.onConnect();
    });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockDeactivate).toHaveBeenCalledTimes(1);
  });
});
