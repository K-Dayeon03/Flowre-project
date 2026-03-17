import { query } from "@anthropic-ai/claude-agent-sdk";
import type { QAResult } from "../index";

const SYSTEM_PROMPT = `
당신은 Flowre 앱의 Auth(인증) 도메인 전문 QA 에이전트입니다.

## 도메인 지식

### 파일 위치
- API:   client/src/api/authApi.ts
- Store: client/src/store/useAuthStore.ts
- HTTP:  client/src/api/client.ts (Axios 인터셉터)
- 화면:  client/src/screens/auth/LoginScreen.tsx

### 핵심 로직
1. **JWT 토큰 관리**
   - Access Token (30분): AsyncStorage 'flowre_access_token' 키에 저장
   - Refresh Token (7일): HttpOnly Cookie — 클라이언트가 직접 접근 불가
   - 401 응답 시 /api/auth/refresh 자동 호출 (pendingQueue로 동시 갱신 방지)

2. **useAuthStore 상태 흐름**
   - login() → __DEV__ 분기 → mockUser 반환 (개발) or authApi.login() 호출
   - restoreSession() → AsyncStorage 토큰 확인 → authApi.me() 검증
   - logout() → authApi.logout() + AsyncStorage 삭제

3. **UserRole 권한 계층**
   - STORE_STAFF < STORE_MANAGER < HQ_STAFF < ADMIN
   - role별 채팅 권한 차이 있음 (다른 도메인과 연계)

### 테스트 시 주의사항
- __DEV__ 환경에서는 API 호출 없이 mock 로그인 처리됨
- AsyncStorage는 @react-native-async-storage/async-storage mock 필요
- Axios 인터셉터 테스트 시 axios-mock-adapter 사용 권장
- pendingQueue 동시성 로직은 반드시 테스트 필요 (race condition 위험)

## 테스트 프레임워크
- Jest + React Native Testing Library
- jest.config.js에 'jest-expo' preset 사용
`;

const TASK_PROMPT = `
client/src/api/authApi.ts 와 client/src/store/useAuthStore.ts 를 분석하고
다음 절차로 Auth 도메인 테스트를 작성·실행하세요.

## 단계별 작업

### 1. 현재 상태 파악
- client/ 디렉토리에서 기존 테스트 파일 탐색 (*.test.ts, __tests__/)
- package.json에 Jest 설정 여부 확인
- Jest가 없다면 설치 및 설정 추가:
  \`\`\`
  npm install --save-dev jest @types/jest ts-jest jest-expo \
    @testing-library/react-native @testing-library/jest-native \
    axios-mock-adapter
  \`\`\`
  jest.config.js 생성 (preset: 'jest-expo')

### 2. authApi.ts 단위 테스트 작성
파일: client/src/api/__tests__/authApi.test.ts

테스트 케이스:
- login() 성공: 올바른 이메일/비밀번호 → accessToken + user 반환
- login() 실패: 잘못된 비밀번호 → 에러 throw
- logout() 성공: POST /api/auth/logout 호출
- me() 성공: Bearer 토큰 헤더 포함 확인
- me() 실패: 401 응답 → 에러 throw
- refresh() 성공: withCredentials: true 포함 확인
- unwrap() 헬퍼: data.data 경로 정상 언래핑

### 3. Axios 인터셉터 테스트 작성
파일: client/src/api/__tests__/client.test.ts

테스트 케이스:
- 요청 인터셉터: AsyncStorage 토큰 → Authorization 헤더 자동 주입
- 요청 인터셉터: 토큰 없을 때 Authorization 헤더 미포함
- 응답 인터셉터 401: refresh 성공 → 원래 요청 재시도
- 응답 인터셉터 401: refresh 실패 → AsyncStorage 토큰 삭제 후 에러
- 동시 401 응답: pendingQueue로 refresh 1회만 호출되는지 확인 (중요!)
- 비-401 에러: 그대로 reject

### 4. useAuthStore 단위 테스트 작성
파일: client/src/store/__tests__/useAuthStore.test.ts

테스트 케이스:
- 초기 상태: { user: null, accessToken: null, isLoggedIn: false, loading: false }
- login() 성공 (production): user, accessToken 세팅 + AsyncStorage 저장
- login() 성공 (DEV 모드): mockUser 반환 + 'dev-token' 저장
- login() 실패: loading false 복구 확인
- logout(): 상태 초기화 + AsyncStorage 삭제
- setTokens(): accessToken 업데이트 + AsyncStorage 저장
- restoreSession() 성공: 토큰 존재 → me() 호출 → 상태 복원
- restoreSession() 실패: 토큰 만료 → AsyncStorage 삭제, 상태 유지

### 5. 테스트 실행 및 검증
\`\`\`bash
cd client && npx jest --testPathPattern="auth|client" --coverage
\`\`\`
실패한 케이스가 있으면 원인 분석 후 수정

### 6. 결과 요약
- 총 테스트 수, 통과/실패 수
- 커버리지 (목표: authApi ≥ 90%, useAuthStore ≥ 85%)
- 발견된 버그 또는 개선 사항
`;

/**
 * Auth 도메인 QA 에이전트 실행
 */
export async function runAuthAgent(): Promise<QAResult> {
  console.log("\n🔐 Auth 도메인 QA 에이전트 시작...\n");

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

  return { domain: "Auth", result };
}
