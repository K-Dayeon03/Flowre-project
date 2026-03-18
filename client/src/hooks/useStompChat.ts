import { useEffect, useRef, useCallback } from 'react';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { Message } from '../api/chatApi';

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
        console.error('[STOMP] error:', frame.headers['message']);
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

  const sendMessage = useCallback(
    (content: string, type: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT') => {
      if (__DEV__) {
        // DEV 모드: store에 로컬 메시지 직접 추가
        const localMsg: Message = {
          id: Date.now(),
          roomId,
          senderId: user?.id ?? 1,
          senderName: user?.name ?? '나',
          content,
          type,
          sentAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          isMe: true,
        };
        addMessage(roomId, localMsg);
        return;
      }
      if (!clientRef.current?.connected) {
        console.warn('[STOMP] 연결되지 않음 — REST fallback 필요');
        return;
      }
      clientRef.current.publish({
        destination: '/app/chat.send',
        body: JSON.stringify({ roomId, content, type }),
      });
    },
    [roomId, user, addMessage]
  );

  return {
    sendMessage,
    connected: clientRef.current?.connected ?? false,
  };
}
