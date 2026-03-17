import { query } from "@anthropic-ai/claude-agent-sdk";
import type { QAResult } from "../index";

const SYSTEM_PROMPT = `
당신은 Flowre 앱의 Schedule(스케줄) 도메인 전문 QA 에이전트입니다.

## 도메인 지식

### 파일 위치
- API:   client/src/api/scheduleApi.ts
- Store: client/src/store/useScheduleStore.ts
- 목록:  client/src/screens/schedule/ScheduleListScreen.tsx
- 상세:  client/src/screens/schedule/ScheduleDetailScreen.tsx
- 생성:  client/src/screens/schedule/ScheduleCreateScreen.tsx

### 핵심 모델
\`\`\`ts
type ScheduleType   = 'MANNEQUIN' | 'HQ_VISIT' | 'VM_CHECK' | 'OTHER'
type ScheduleStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE'

interface Schedule {
  id: number
  title: string
  type: ScheduleType
  status: ScheduleStatus
  dueDate: string        // ISO 8601
  assignee: string
  storeId: number
  description?: string
  createdAt: string
  createdBy: string
}
\`\`\`

### API 엔드포인트
- GET    /api/schedules          → 목록 (status, storeId 필터 가능)
- GET    /api/schedules/:id      → 단건
- POST   /api/schedules          → 생성
- PUT    /api/schedules/:id      → 수정
- PATCH  /api/schedules/:id/complete → 완료 처리
- DELETE /api/schedules/:id      → 삭제

### 비즈니스 규칙
1. 완료 처리(complete): DONE 이외 상태에서만 가능 → PATCH 성공 후 store 낙관적 업데이트
2. 브랜드 격리: 모든 요청에 brandId 필터 필수 (서버에서 처리)
3. 담당자(assignee): 필수 아님, 없으면 미배정 처리
4. dueDate: 과거 날짜도 입력 가능 (서버에서 유효성 검증)

### Store 낙관적 업데이트 패턴
- createSchedule: API 응답을 배열 앞에 추가 ([created, ...prev])
- completeSchedule: 로컬 상태를 DONE으로 즉시 변경 (API 응답 불필요)
- deleteSchedule: 로컬 배열에서 즉시 제거

### 테스트 시 주의사항
- scheduleApi는 axios mock으로 격리 테스트
- useScheduleStore는 zustand의 실제 store 인스턴스 사용 (act() 필요)
- 스크린 테스트 시 NavigationContainer wrapper 필요
`;

const TASK_PROMPT = `
client/src/api/scheduleApi.ts 와 client/src/store/useScheduleStore.ts 를 분석하고
다음 절차로 Schedule 도메인 테스트를 작성·실행하세요.

## 단계별 작업

### 1. 기존 테스트 환경 확인
- Jest 설정(jest.config.js, package.json의 jest 항목) 이미 있는지 확인
- 없으면 Auth 에이전트가 생성했을 것이므로, 있는 설정 재사용

### 2. scheduleApi.ts 단위 테스트 작성
파일: client/src/api/__tests__/scheduleApi.test.ts

테스트 케이스:
- getList() 기본: GET /api/schedules 호출 + Schedule[] 반환
- getList({ status: 'PENDING' }): 쿼리 파라미터 포함 확인
- getList({ storeId: 1 }): storeId 필터 확인
- getById(1): GET /api/schedules/1 경로 확인
- create({ title, type, dueDate }): POST body 검증 + 생성된 Schedule 반환
- create() - description 없을 때: 정상 처리 (optional 필드)
- update(1, { title: '변경' }): PUT /api/schedules/1, Partial 처리
- complete(1): PATCH /api/schedules/1/complete 호출
- complete(1) 실패: 서버 에러 시 에러 propagation
- delete(1): DELETE /api/schedules/1 호출

### 3. useScheduleStore 단위 테스트 작성
파일: client/src/store/__tests__/useScheduleStore.test.ts

테스트 케이스:
- 초기 상태: { schedules: [], loading: false, error: null }

- fetchSchedules() 성공:
  - loading true → false 전환 확인
  - 반환된 schedules로 상태 갱신

- fetchSchedules() 실패:
  - error 메시지 세팅
  - loading false 복구

- createSchedule() 성공:
  - 새 스케줄이 배열 맨 앞에 추가 ([created, ...prev]) ← 중요!
  - loading 복구

- completeSchedule(id):
  - 해당 id의 status가 'DONE'으로 변경
  - 나머지 스케줄은 변경 없음 (불변성 확인)
  - API 호출 1회만 발생

- deleteSchedule(id):
  - 해당 id 스케줄이 배열에서 제거
  - 다른 스케줄은 유지

- completeSchedule — 존재하지 않는 id: 배열 변화 없음

### 4. 타입 안전성 검증 테스트
파일: client/src/api/__tests__/scheduleTypes.test.ts

- ScheduleType enum 값 전체 커버: MANNEQUIN, HQ_VISIT, VM_CHECK, OTHER
- ScheduleStatus enum 값 전체 커버: PENDING, IN_PROGRESS, DONE
- ScheduleCreateRequest: assignee, description 없이 생성 가능한지
- Schedule.dueDate: ISO 8601 문자열 형식 유효성 (정규식 검증)

### 5. 테스트 실행 및 검증
\`\`\`bash
cd client && npx jest --testPathPattern="schedule" --coverage
\`\`\`
실패 케이스 원인 분석 후 수정

### 6. 결과 요약
- 총 테스트 수, 통과/실패 수
- 커버리지 (목표: scheduleApi ≥ 90%, useScheduleStore ≥ 85%)
- 낙관적 업데이트 로직의 정확성 평가
- 발견된 버그 또는 엣지케이스
`;

/**
 * Schedule 도메인 QA 에이전트 실행
 */
export async function runScheduleAgent(): Promise<QAResult> {
  console.log("\n📅 Schedule 도메인 QA 에이전트 시작...\n");

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

  return { domain: "Schedule", result };
}
