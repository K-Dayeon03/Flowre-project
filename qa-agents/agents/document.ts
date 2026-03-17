import { query } from "@anthropic-ai/claude-agent-sdk";
import type { QAResult } from "../index";

const SYSTEM_PROMPT = `
당신은 Flowre 앱의 Document(문서) 도메인 전문 QA 에이전트입니다.

## 도메인 지식

### 파일 위치
- API:    client/src/api/documentApi.ts
- 목록:   client/src/screens/document/DocumentListScreen.tsx
- 상세:   client/src/screens/document/DocumentDetailScreen.tsx
- 업로드: client/src/screens/document/DocumentUploadScreen.tsx

### 핵심 모델
\`\`\`ts
type DocumentCategory = 'MANUAL' | 'NOTICE' | 'REPORT'

interface Document {
  id: number
  title: string
  category: DocumentCategory
  fileType: string       // 'pdf', 'xlsx', 'docx' 등
  size: string           // '2.4 MB' 형식 문자열
  s3Url: string          // 다운로드/미리보기용 S3 서명 URL
  uploader: string
  brandId: number        // 브랜드 격리 필드 ← 필수!
  description?: string
  createdAt: string
}

interface PresignedUrlResponse {
  presignedUrl: string   // S3 PUT URL (단기 유효)
  s3Key: string          // 서버에 등록할 경로 키
}
\`\`\`

### S3 업로드 2단계 플로우 (핵심!)
\`\`\`
클라이언트                    서버                     S3
    │                          │                        │
    │── POST /presigned-url ──>│                        │
    │<── { presignedUrl, s3Key }│                       │
    │                          │                        │
    │── PUT {presignedUrl} ─────────────────────────────>│ (서버 미경유!)
    │<── 200 OK ────────────────────────────────────────│
    │                          │                        │
    │── POST /documents ──────>│                        │
    │   { title, category,     │                        │
    │     s3Key, description } │                        │
    │<── Document ────────────│                         │
\`\`\`

### 비즈니스 규칙
1. **브랜드 격리**: brandId 다른 문서 접근 불가 (서버 책임이지만 테스트 필요)
2. **카테고리 필터**: getList({ category }) → 탭별 문서 분리
3. **S3 직접 업로드**: uploadToS3는 서버를 거치지 않고 Presigned URL에 직접 PUT
4. **삭제**: S3 파일 삭제는 서버에서 처리, 클라이언트는 DELETE /api/documents/:id만 호출

### 테스트 주의사항
- uploadToS3는 native \`fetch\`를 사용 → jest 환경에서 global.fetch mock 필요
- Presigned URL은 단기 유효 → 만료 케이스 테스트 필요
- s3Url (다운로드용)과 presignedUrl (업로드용)은 다른 URL임
`;

const TASK_PROMPT = `
client/src/api/documentApi.ts 를 분석하고
다음 절차로 Document 도메인 테스트를 작성·실행하세요.

## 단계별 작업

### 1. 기존 테스트 환경 확인
- jest.config.js 또는 package.json의 jest 설정 확인
- global.fetch mock 세팅 방법 결정 (jest-fetch-mock 또는 jest.spyOn)

### 2. documentApi.ts 단위 테스트 작성
파일: client/src/api/__tests__/documentApi.test.ts

#### 목록/조회 테스트
- getList(): GET /api/documents → Document[] 반환
- getList({ category: 'MANUAL' }): 쿼리 파라미터 category 포함 확인
- getList({ category: 'NOTICE' }): 카테고리별 필터 동작
- getList({ category: 'REPORT' }): 동상
- getById(1): GET /api/documents/1 → 단건 Document 반환
- getById(999): 서버 404 응답 시 에러 throw

#### S3 Presigned URL 플로우 테스트 (핵심!)
- getPresignedUrl('report.pdf', 'application/pdf'):
  - POST /api/documents/presigned-url 호출
  - body에 { fileName, contentType } 포함 확인
  - { presignedUrl, s3Key } 반환 확인

- uploadToS3(presignedUrl, blob, 'application/pdf'):
  - fetch가 presignedUrl로 PUT 요청 발송 확인
  - headers에 'Content-Type: application/pdf' 포함
  - method: 'PUT' 확인
  - body에 Blob 포함 확인
  - 4xx 응답 시 에러 (S3 URL 만료 케이스)

#### 문서 등록 테스트
- create({ title, category, s3Key }):
  - POST /api/documents body 검증
  - description 없어도 정상 처리 (optional)
  - 반환된 Document에 brandId 존재 확인 ← 격리 검증
- create({ title, category, s3Key, description }): description 포함 케이스

#### 전체 업로드 시나리오 통합 테스트
\`\`\`
it('전체 업로드 플로우: presignedUrl 발급 → S3 업로드 → 메타데이터 등록', async () => {
  // 1. presigned URL 발급 mock
  // 2. S3 PUT mock (fetch)
  // 3. create mock
  // 전체 3단계가 올바른 순서로 호출됐는지 확인
})
\`\`\`

#### 삭제 테스트
- delete(1): DELETE /api/documents/1 호출

### 3. brandId 격리 검증 테스트
파일: client/src/api/__tests__/documentBrandIsolation.test.ts

- 응답 Document에 brandId가 항상 존재하는지 (undefined 방지)
- brandId가 다른 문서 목록 반환 시: 클라이언트 레벨 필터 로직 있는지 검증
  (없다면 서버 책임임을 주석으로 명시)

### 4. 테스트 실행 및 검증
\`\`\`bash
cd client && npx jest --testPathPattern="document" --coverage
\`\`\`
실패 케이스 원인 분석 후 수정

### 5. 결과 요약
- 총 테스트 수, 통과/실패 수
- 커버리지 (목표: documentApi ≥ 90%)
- S3 2단계 플로우의 테스트 안정성 평가
- fetch mock 처리 방식 설명
- 발견된 버그 또는 엣지케이스
`;

/**
 * Document 도메인 QA 에이전트 실행
 */
export async function runDocumentAgent(): Promise<QAResult> {
  console.log("\n📄 Document 도메인 QA 에이전트 시작...\n");

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

  return { domain: "Document", result };
}
