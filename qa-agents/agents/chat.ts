import { query } from "@anthropic-ai/claude-agent-sdk";
import type { QAResult } from "../index";

const SYSTEM_PROMPT = `
당신은 Flowre 앱의 Chat(채팅) 도메인 전문 QA 에이전트입니다.

## 도메인 지식

### 파일 위치
- API:   client/src/api/chatApi.ts
- Store: client/src/store/useChatStore.ts
- 훅:   client/src/hooks/useStompChat.ts
- 목록:  client/src/screens/chat/ChatRoomListScreen.tsx
- 채팅:  client/src/screens/chat/ChatRoomScreen.tsx

### 핵심 모델
\`\`\`ts
type RoomType    = 'GROUP' | 'DIRECT'
type MessageType = 'TEXT' | 'IMAGE' | 'FILE'

interface ChatRoom {
  id: number
  name: string
  type: RoomType
  storeId?: number     // GROUP만 있음, DIRECT는 undefined
  lastMessage: string
  lastAt: string
  unread: number
  members: number
}

interface Message {
  id: number
  roomId: number
  senderId: number
  senderName: string
  content: string
  type: MessageType
  sentAt: string
  isMe: boolean        // 클라이언트에서 판별
}
\`\`\`

### STOMP 연결 구조 (useStompChat)
\`\`\`
WS_URL = EXPO_PUBLIC_WS_URL + '/ws/chat'  (기본: ws://localhost:8080/ws/chat)

Client 설정:
  brokerURL: WS_URL
  connectHeaders: { Authorization: 'Bearer {accessToken}' }   ← JWT 인증
  reconnectDelay: 5000

onConnect:
  subscribe('/topic/room.{roomId}', onMessage)  ← 구독
  markRoomRead(roomId)

onMessage:
  JSON.parse(frame.body) → Message
  addMessage(roomId, message)

sendMessage(content, type):
  publish({ destination: '/app/chat.send', body: JSON.stringify({ roomId, content, type }) })

cleanup (unmount):
  subscriptionRef.unsubscribe()
  client.deactivate()
\`\`\`

### 비즈니스 규칙 (1:1 채팅 권한)
- GROUP: 매장 소속 직원 전원 자동 입장, storeId 필수
- DIRECT: 두 사용자 간 1:1, storeId = null
  - STORE_STAFF: 같은 매장 직원끼리만 가능
  - STORE_MANAGER: 같은 매장 + HQ_STAFF와 가능
  - 권한 검증은 서버에서 처리 (POST /api/chat/rooms/direct)

### useChatStore 핵심 로직
- addMessage: 새 메시지 → messages[roomId] 배열에 추가
             + rooms 배열에서 해당 room의 lastMessage, lastAt 갱신, unread + 1
- markRoomRead: 해당 roomId의 unread = 0

### 테스트 주의사항
- @stomp/stompjs Client는 jest.mock()으로 모킹 필요
- useStompChat은 React 훅 → renderHook() + act() 사용
- STOMP onConnect/onMessage 콜백은 mock Client에서 수동 트리거 필요
- WebSocket 환경: jest 환경에서 ws 미지원 → mock으로 완전 대체
`;

const TASK_PROMPT = `
client/src/api/chatApi.ts, client/src/store/useChatStore.ts,
client/src/hooks/useStompChat.ts 를 분석하고
다음 절차로 Chat 도메인 테스트를 작성·실행하세요.

## 단계별 작업

### 1. 기존 테스트 환경 확인
- jest.config.js 확인, @stomp/stompjs mock 전략 결정
- renderHook 사용 가능한지 확인 (@testing-library/react-hooks 또는 최신 @testing-library/react)

### 2. chatApi.ts 단위 테스트 작성
파일: client/src/api/__tests__/chatApi.test.ts

- getRooms(): GET /api/chat/rooms → ChatRoom[] 반환
- getMessages(1): GET /api/chat/rooms/1/messages 경로 확인
- getMessages(1, { before: 50, limit: 20 }): 쿼리 파라미터 확인
- getMessages(1, {}): 빈 params 시 정상 처리
- createDirectRoom(42): POST /api/chat/rooms/direct, body: { targetUserId: 42 }
- createDirectRoom — 서버 403 응답 (권한 없음): 에러 throw 확인
- sendMessage({ roomId: 1, content: '안녕', type: 'TEXT' }):
  POST /api/chat/rooms/1/messages, body 검증
- sendMessage type 'IMAGE': 경로와 type 필드 확인
- markRead(1): POST /api/chat/rooms/1/read 호출

### 3. useChatStore 단위 테스트 작성
파일: client/src/store/__tests__/useChatStore.test.ts

- 초기 상태: { rooms: [], messages: {}, loading: false }

- fetchRooms() 성공: rooms 배열 갱신, loading 복구
- fetchRooms() 실패: loading false 복구, rooms 유지

- fetchMessages(1) 성공: messages[1] 세팅
- fetchMessages(1) 두 번 호출: 두 번째 결과로 덮어쓰기

- addMessage(1, newMsg):
  - messages[1] 배열에 newMsg 추가
  - rooms에서 id=1인 방의 lastMessage = newMsg.content
  - rooms에서 id=1인 방의 lastAt = newMsg.sentAt
  - rooms에서 id=1인 방의 unread += 1 ← 중요!
  - 다른 방(id=2)은 변화 없음 (불변성)

- addMessage — messages[roomId] 없을 때: 빈 배열에서 시작 (undefined 방어)

- markRoomRead(1):
  - id=1 방의 unread = 0
  - 다른 방 unread 변화 없음

### 4. useStompChat 훅 테스트 작성
파일: client/src/hooks/__tests__/useStompChat.test.ts

@stomp/stompjs 모킹 전략:
\`\`\`ts
jest.mock('@stomp/stompjs', () => ({
  Client: jest.fn().mockImplementation(() => ({
    activate: jest.fn(),
    deactivate: jest.fn(),
    subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
    publish: jest.fn(),
    connected: true,
  }))
}))
\`\`\`

테스트 케이스:
- 마운트 시 Client.activate() 호출 확인
- connectHeaders에 'Bearer dev-token' 포함 확인
- onConnect 트리거 시 subscribe('/topic/room.{roomId}') 호출
- onConnect 트리거 시 markRoomRead(roomId) 호출

- onMessage 수신 시 addMessage(roomId, parsedMessage) 호출
  (frame.body에 JSON 문자열 전달)

- sendMessage('안녕') — connected: true:
  client.publish 호출, destination: '/app/chat.send'
  body: JSON.stringify({ roomId, content: '안녕', type: 'TEXT' })

- sendMessage() — connected: false:
  publish 호출 안 됨, console.warn 호출 확인

- unmount 시:
  subscription.unsubscribe() 호출
  client.deactivate() 호출

- accessToken 없을 때: Client 생성 안 됨 (early return)

### 5. 채팅방 타입 규칙 검증 테스트
파일: client/src/api/__tests__/chatRoomRules.test.ts

- GROUP 채팅방: storeId 존재 (number), type = 'GROUP'
- DIRECT 채팅방: storeId = undefined, type = 'DIRECT'
- unread 초기값: number 타입 (음수 없음)
- Message.isMe: boolean 타입 확인

### 6. 테스트 실행 및 검증
\`\`\`bash
cd client && npx jest --testPathPattern="chat|stomp" --coverage
\`\`\`
실패 케이스 원인 분석 후 수정

### 7. 결과 요약
- 총 테스트 수, 통과/실패 수
- 커버리지 (목표: chatApi ≥ 90%, useChatStore ≥ 85%, useStompChat ≥ 75%)
- STOMP mock 처리 방식 설명
- 발견된 버그 또는 엣지케이스 (특히 addMessage 불변성, cleanup 누락 등)
`;

/**
 * Chat 도메인 QA 에이전트 실행
 */
export async function runChatAgent(): Promise<QAResult> {
  console.log("\n💬 Chat 도메인 QA 에이전트 시작...\n");

  let result = "";

  for await (const message of query({
    prompt: TASK_PROMPT,
    options: {
      cwd: "c:/Flowre-project",
      model: "claude-opus-4-6",
      allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
      permissionMode: "acceptEdits",
      maxTurns: 40,
      systemPrompt: SYSTEM_PROMPT,
    },
  })) {
    if ("result" in message) {
      result = message.result;
    }
  }

  return { domain: "Chat", result };
}
