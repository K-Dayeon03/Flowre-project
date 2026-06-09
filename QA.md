# QA 규칙 및 가이드라인

Flowre 프로젝트의 QA 자동화 에이전트 운영 규칙과 테스트 작성 기준을 정의합니다.

---

## 1. 테스트 환경 규칙

### 프레임워크
- **프론트엔드**: Jest + React Native Testing Library (`jest-expo` preset)
- **백엔드**: JUnit5 + Mockito + Spring Boot Test

### Jest 필수 설정 (`client/jest.config.js`)
```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterFramework: ['@testing-library/jest-native/extend-expect'],
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/__mocks__/@react-native-async-storage/async-storage.js',
  },
};
```

### 필수 Mock 대상
| 라이브러리 | Mock 방법 |
|---|---|
| `@react-native-async-storage/async-storage` | `__mocks__` 디렉토리 파일 |
| `axios` / `apiClient` | `axios-mock-adapter` |
| `@stomp/stompjs` | `jest.mock()` |
| `global.fetch` | `jest.spyOn(global, 'fetch')` |
| `AsyncStorage` | `jest.mock()` + in-memory store |

---

## 2. 도메인별 테스트 커버리지 목표

| 도메인 | 대상 파일 | 목표 커버리지 |
|---|---|---|
| Auth | `authApi.ts`, `useAuthStore.ts`, `client.ts` | ≥ 90% / ≥ 85% / ≥ 80% |
| Schedule | `scheduleApi.ts`, `useScheduleStore.ts` | ≥ 90% / ≥ 85% |
| Document | `documentApi.ts` | ≥ 90% |
| Chat | `chatApi.ts`, `useChatStore.ts`, `useStompChat.ts` | ≥ 90% / ≥ 85% / ≥ 75% |

---

## 3. 테스트 파일 위치 규칙

```
client/src/
├── api/
│   └── __tests__/
│       ├── authApi.test.ts
│       ├── scheduleApi.test.ts
│       ├── documentApi.test.ts
│       └── chatApi.test.ts
├── store/
│   └── __tests__/
│       ├── useAuthStore.test.ts
│       ├── useScheduleStore.test.ts
│       └── useChatStore.test.ts
└── hooks/
    └── __tests__/
        └── useStompChat.test.ts
```

- 테스트 파일명: `{대상파일명}.test.ts`
- 위치: 대상 파일과 같은 디렉토리의 `__tests__/` 폴더

---

## 4. 도메인별 필수 테스트 케이스

### 4-1. Auth 도메인

**반드시 테스트해야 할 케이스:**

```
authApi
  ✓ login() — 성공: accessToken + user 반환
  ✓ login() — 실패: 에러 throw
  ✓ me() — Bearer 헤더 자동 포함
  ✓ refresh() — withCredentials: true 포함

Axios 인터셉터 (client.ts)
  ✓ 요청 시 AsyncStorage 토큰 → Authorization 헤더 주입
  ✓ 401 응답 → refresh 자동 호출 → 원본 요청 재시도
  ✓ 동시 401 발생 → refresh 1회만 호출 (pendingQueue 로직) ← 필수!
  ✓ refresh 실패 → AsyncStorage 토큰 삭제

useAuthStore
  ✓ login() DEV 모드 → mockUser 반환 (API 호출 없음)
  ✓ login() production → authApi.login() 호출
  ✓ restoreSession() — 토큰 존재 → me() 검증
  ✓ restoreSession() — 토큰 만료 → AsyncStorage 삭제
  ✓ logout() — 상태 초기화 + AsyncStorage 삭제
```

**pendingQueue 동시성 테스트는 Auth 에이전트의 최우선 검증 항목입니다.**

---

### 4-2. Schedule 도메인

**반드시 테스트해야 할 케이스:**

```
scheduleApi
  ✓ getList({ status }) — 쿼리 파라미터 전달
  ✓ complete(id) — PATCH /{id}/complete 경로
  ✓ update(id, partial) — Partial<ScheduleCreateRequest> 처리

useScheduleStore
  ✓ createSchedule() — 새 항목이 배열 맨 앞에 추가 ([created, ...prev])
  ✓ completeSchedule(id) — 해당 id만 DONE, 나머지 불변
  ✓ deleteSchedule(id) — 해당 id만 제거, 나머지 불변
  ✓ fetchSchedules() 실패 — error 세팅, loading 복구

타입 검증
  ✓ ScheduleType 4가지 값 모두 유효: MANNEQUIN, HQ_VISIT, VM_CHECK, OTHER
  ✓ ScheduleStatus 3가지 값 모두 유효: PENDING, IN_PROGRESS, DONE
```

**낙관적 업데이트 순서(`[created, ...prev]`)는 UI 정렬에 영향을 미치므로 반드시 검증합니다.**

---

### 4-3. Document 도메인

**반드시 테스트해야 할 케이스:**

```
documentApi — S3 2단계 플로우 (전체 시나리오 필수!)
  ✓ getPresignedUrl() — POST body: { fileName, contentType }
  ✓ uploadToS3() — fetch PUT, Content-Type 헤더, Blob body
  ✓ uploadToS3() — S3 URL 만료(4xx) → 에러 throw
  ✓ create() — 메타데이터 등록, brandId 응답에 존재
  ✓ 통합: presignedUrl 발급 → S3 업로드 → create() 3단계 순서 검증

카테고리 필터
  ✓ getList({ category: 'MANUAL' })
  ✓ getList({ category: 'NOTICE' })
  ✓ getList({ category: 'REPORT' })

브랜드 격리
  ✓ 응답 Document.brandId가 항상 number 타입 (undefined 금지)
```

**S3 업로드는 서버를 거치지 않으므로 `fetch` mock이 별도로 필요합니다.**

---

### 4-4. Chat 도메인

**반드시 테스트해야 할 케이스:**

```
chatApi
  ✓ getMessages(roomId, { before, limit }) — 페이지네이션 파라미터
  ✓ createDirectRoom() — POST body: { targetUserId }
  ✓ createDirectRoom() — 서버 403 → 에러 throw (권한 없음)
  ✓ markRead(roomId) — POST /rooms/:id/read

useChatStore
  ✓ addMessage() — messages[roomId] 배열 추가
  ✓ addMessage() — rooms에서 lastMessage, lastAt, unread+1 갱신
  ✓ addMessage() — 다른 방은 변경 없음 (불변성)
  ✓ addMessage() — messages[roomId] 없을 때 빈 배열에서 시작
  ✓ markRoomRead() — 해당 방만 unread=0, 나머지 불변

useStompChat
  ✓ 마운트 시 activate() 호출
  ✓ connectHeaders에 'Bearer {token}' 포함
  ✓ onConnect → subscribe('/topic/room.{roomId}')
  ✓ sendMessage() — connected: true → publish() 호출
  ✓ sendMessage() — connected: false → publish 호출 안 됨
  ✓ unmount → unsubscribe() + deactivate() 호출 (cleanup 누락 금지!)
```

**STOMP cleanup 누락은 메모리 누수와 중복 구독을 유발합니다. unmount 테스트는 필수입니다.**

---

## 5. 공통 테스트 작성 규칙

### 테스트 구조
```ts
describe('대상 파일명', () => {
  describe('함수명()', () => {
    it('성공 케이스 설명', async () => { ... })
    it('실패 케이스 설명', async () => { ... })
    it('엣지 케이스 설명', async () => { ... })
  })
})
```

### 금지 사항
- `any` 타입 사용 금지 — 명시적 타입 지정
- 실제 API 호출 금지 — 반드시 mock 사용
- `console.log` 테스트 코드 내 사용 금지 — `console.error` mock으로 대체
- `setTimeout` 실제 대기 금지 — `jest.useFakeTimers()` 사용
- 테스트 간 상태 공유 금지 — `beforeEach`에서 store/mock 초기화

### Zustand Store 초기화 패턴
```ts
beforeEach(() => {
  useScheduleStore.setState({
    schedules: [],
    loading: false,
    error: null,
  })
})
```

### 비동기 테스트 패턴
```ts
it('fetchSchedules 성공', async () => {
  mockAdapter.onGet('/api/schedules').reply(200, { data: mockSchedules })
  await act(async () => {
    await useScheduleStore.getState().fetchSchedules()
  })
  expect(useScheduleStore.getState().schedules).toEqual(mockSchedules)
})
```

---

## 6. QA 에이전트 운영 규칙

### 에이전트 위치
```
qa-agents/
├── index.ts          # CLI 진입점
└── agents/
    ├── auth.ts       # 🔐 Auth 에이전트
    ├── schedule.ts   # 📅 Schedule 에이전트
    ├── document.ts   # 📄 Document 에이전트
    └── chat.ts       # 💬 Chat 에이전트
```

### 실행 명령어
```bash
cd qa-agents && npm install

npx ts-node index.ts auth       # Auth만
npx ts-node index.ts schedule   # Schedule만
npx ts-node index.ts document   # Document만
npx ts-node index.ts chat       # Chat만
npx ts-node index.ts all        # 전체 순차 실행
```

### 에이전트 실행 조건
- **기능 추가 후**: 해당 도메인 에이전트 단독 실행
- **리팩토링 후**: 영향받는 도메인 에이전트 실행
- **PR 머지 전**: `all` 모드로 전체 실행
- **버그 발생 시**: 해당 도메인 에이전트로 원인 분석

### 에이전트 모델
- 기본 모델: `claude-opus-4-6`
- maxTurns: 40 (도메인당)
- permissionMode: `acceptEdits` (테스트 파일 자동 수정 허용)

---

## 7. 브랜드 격리 QA 규칙

모든 도메인에서 **brandId 격리**는 최우선 보안 요구사항입니다.

```
검증 항목:
  ✓ API 응답에 brandId 필드 존재 (Document, Schedule)
  ✓ brandId가 undefined/null이 아닌 number 타입
  ✓ 다른 brandId 데이터가 응답에 혼입되지 않음 (서버 책임)
  ✓ 클라이언트 필터 로직 있을 경우: 이중 검증 테스트
```

---

## 8. 커버리지 리포트

테스트 실행 후 커버리지 확인:

```bash
cd client && npx jest --coverage --coverageReporters=text-summary
```

커버리지 임계값 미달 시 에이전트 재실행:
```bash
cd qa-agents && npx ts-node index.ts <미달 도메인>
```
