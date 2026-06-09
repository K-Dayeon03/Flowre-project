import { useEffect, useRef, useCallback } from 'react';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { chatApi, Message, MessageType } from '../api/chatApi';
import { logger } from '../utils/logger';

const WS_URL = (process.env.EXPO_PUBLIC_WS_URL ?? 'ws://localhost:8080') + '/ws/chat';

/**
 * STOMP 채팅 WebSocket 훅
 *
 * 사용법:
 *   const { sendMessage, connected } = useStompChat(roomId);
 */
export function useStompChat(roomId: number) {
  const clientRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<StompSubscription | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const addMessage = useChatStore((s) => s.addMessage);
  const markRoomRead = useChatStore((s) => s.markRoomRead);

  const onMessage = useCallback(
    (frame: IMessage) => {
      const message: Message = JSON.parse(frame.body);
      addMessage(roomId, message);
    },
    [roomId, addMessage]
  );

  useEffect(() => {
    if (!accessToken || __DEV__) return; // DEV 모드: STOMP 연결 생략

    const client = new Client({
      brokerURL: WS_URL,
      connectHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
      reconnectDelay: 5000,
      onConnect: () => {
        subscriptionRef.current = client.subscribe(
          `/topic/room.${roomId}`,
          onMessage
        );
        markRoomRead(roomId);
      },
      onDisconnect: () => {
        subscriptionRef.current = null;
      },
      onStompError: (frame) => {
        logger.error('[STOMP] error:', frame.headers['message']);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      subscriptionRef.current?.unsubscribe();
      client.deactivate();
      clientRef.current = null;
    };
  }, [roomId, accessToken, onMessage, markRoomRead]);

  /**
   * 메시지 전송
   *
   * STOMP 연결 시 WebSocket으로 publish 한다. 미연결 상태에서는 메시지 유실을
   * 막기 위해 REST(`chatApi.sendMessage`)로 fallback 전송하고, 성공 응답을
   * store에 직접 반영한다. REST fallback 실패 시 경고만 남기고 앱을 깨뜨리지
   * 않는다.
   *
   * @param content  메시지 내용
   * @param type     메시지 유형 (TEXT / IMAGE / FILE)
   * @param fileName 첨부 파일명 (IMAGE / FILE인 경우)
   */
  const sendMessage = useCallback(
    async (content: string, type: MessageType = 'TEXT', fileName?: string) => {
      if (__DEV__) {
        // DEV 모드: store에 로컬 메시지 직접 추가
        const localMsg: Message = {
          id: Date.now(),
          roomId,
          senderId: user?.id ?? 1,
          senderName: user?.name ?? '나',
          content,
          type,
          fileName,
          sentAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          isMe: true,
        };
        addMessage(roomId, localMsg);
        return;
      }
      if (clientRef.current?.connected) {
        clientRef.current.publish({
          destination: '/app/chat.send',
          body: JSON.stringify({ roomId, content, type, fileName }),
        });
        return;
      }
      // STOMP 미연결 → REST fallback (메시지 유실 방지)
      logger.warn('[STOMP] 연결되지 않음 — REST fallback으로 전송');
      try {
        const sent = await chatApi.sendMessage({ roomId, content, type, fileName });
        addMessage(roomId, sent);
      } catch (err) {
        logger.error('[STOMP] REST fallback 전송 실패:', err);
      }
    },
    [roomId, user, addMessage]
  );

  return {
    sendMessage,
    connected: clientRef.current?.connected ?? false,
  };
}
