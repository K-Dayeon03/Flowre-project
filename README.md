# Flowre — 매장 통합 업무관리 플랫폼

<div align="center">

**입점 매장 직원 전용 통합 업무 관리 앱**  
스케줄 · 문서 · 채팅 · 공지 · 재고를 하나의 플랫폼에서 처리합니다.

![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.4-6DB33F?style=flat-square&logo=springboot&logoColor=white)
![Java](https://img.shields.io/badge/Java-17-ED8B00?style=flat-square&logo=openjdk&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?style=flat-square&logo=mysql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-EC2_·_S3-FF9900?style=flat-square&logo=amazonaws&logoColor=white)

</div>

---

## 목차

- [프로젝트 개요](#프로젝트-개요)
- [주요 기능](#주요-기능)
- [아키텍처](#아키텍처)
- [도메인 모델](#도메인-모델)
- [로직 흐름](#로직-흐름)
- [API 명세](#api-명세)
- [로컬 개발 환경 설정](#로컬-개발-환경-설정)
- [환경 변수](#환경-변수)
- [프로젝트 구조](#프로젝트-구조)
- [개발 가이드](#개발-가이드)
- [테스트](#테스트)

---

## 프로젝트 개요

Flowre는 **오프라인 매장 직원과 본사 직원이 하나의 플랫폼에서 업무를 처리할 수 있는 통합 관리 시스템**입니다.

| 구분 | 대상 | 주요 업무 |
|------|------|-----------|
| 매장 직원 (STORE_STAFF) | 현장 직원 | 스케줄 확인, 문서 열람, 채팅 |
| 매장 점장 (STORE_MANAGER) | 매장 책임자 | 직원 승인, 공지 작성, 스케줄 관리 |
| 본사 직원 (HQ_STAFF) | 본사 담당자 | 매장 등록, 직원 발급, 문서 관리 |
| 시스템 관리자 (ADMIN) | 시스템 운영자 | 전체 관리, 브랜드 설정 |

> **브랜드 격리 정책**: 모든 데이터는 `brandId`로 격리됩니다.  
> 같은 브랜드 내에서만 데이터가 공유되며, 타 브랜드 데이터는 API 레벨에서 차단됩니다.

---

## 주요 기능

<details>
<summary><strong>🗓 스케줄 관리</strong></summary>

- 스케줄 CRUD (유형: 마네킹 / 본사 방문 / VM 체크 / 기타)
- 상태 관리: 대기 → 진행 중 → 완료
- 담당자 배정 및 마감일 설정
- 오늘 스케줄 대시보드 요약

</details>

<details>
<summary><strong>📄 문서 관리</strong></summary>

- AWS S3 Presigned URL 직접 업로드 방식
- 카테고리 분류: 매뉴얼 / 공지 / 리포트
- 업로더 본인 또는 본사만 수정·삭제 가능
- 브랜드 단위 문서 격리 (`brandId` 필터)

</details>

<details>
<summary><strong>💬 채팅 (브랜드 격리)</strong></summary>

- STOMP over WebSocket 실시간 채팅
- 채팅방 유형: GROUP (매장 전체) / DIRECT (1:1)
- **브랜드 격리**: 타 브랜드 채팅방 접근 완전 차단
- **역할별 1:1 채팅 제한**
  - `STORE_STAFF`: 같은 매장 직원끼리만
  - `STORE_MANAGER`: 같은 매장 + 본사 직원(HQ_STAFF)
  - `HQ_STAFF` / `ADMIN`: 제한 없음
- 안읽음 뱃지, 커서 기반 메시지 페이징
- REST fallback (STOMP 연결 불가 시)

</details>

<details>
<summary><strong>📢 공지</strong></summary>

- 점장 이상 공지 작성 권한
- 핀 고정 공지 대시보드 노출
- 안읽음 카운트 실시간 추적

</details>

<details>
<summary><strong>🏪 매장 등록 (본사 전용)</strong></summary>

- 점별 코드 자동 발급 (4자리 숫자, 브랜드 내 중복 방지)
- 카카오 로컬 API 기반 주소 검색 (REST 키 서버 보관, 클라이언트 미노출)
- GPS 좌표 등록 및 근처 매장 조회 (하버사인 공식)
- 주소 수정 API (도로명·우편번호·상세주소)

</details>

<details>
<summary><strong>👥 직원 등록 · 승인</strong></summary>

- 본사가 직원 아이디(점별 코드 + 식별자) 발급
- 매장 직원 등록 시 점장 승인 필요 (PENDING → ACTIVE)
- 점장 미등록 매장의 첫 점장은 즉시 ACTIVE
- 승인 거절 사유 기록, 감사 로그(Audit Trail) 자동 적재

</details>

<details>
<summary><strong>📦 재고 관리</strong></summary>

- 매장별 재고 CRUD
- 낙관적 락(Optimistic Lock) 동시성 제어
- 대량 데이터 배치 업로드 (CSV, 배치 크기 500)

</details>

---

## 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        클라이언트 (Expo)                         │
│                                                                 │
│  LoginScreen  HomeScreen  ChatRoomList  StoreManage  ...        │
│       │            │            │              │                │
│   Zustand     Zustand      STOMP.js        Axios               │
│   (auth)   (schedule)   (WebSocket)   (REST API)               │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / WSS
┌────────────────────────────▼────────────────────────────────────┐
│                    Spring Boot 서버 (EC2)                        │
│                                                                 │
│  ┌─────────────┐  ┌───────────────┐  ┌──────────────────────┐  │
│  │ Security    │  │ REST API      │  │ STOMP WebSocket      │  │
│  │ (JWT Filter)│  │ Controllers   │  │ ChatWebSocketCtrl    │  │
│  └──────┬──────┘  └───────┬───────┘  └──────────┬───────────┘  │
│         └─────────────────┼──────────────────────┘              │
│  ┌──────────────────────  ▼  ──────────────────────────────┐    │
│  │                    Service Layer                         │    │
│  │  AuthService │ ChatService │ StoreService │ UserService  │    │
│  │  ScheduleSvc │ DocumentSvc │ NoticeSvc   │ InventorySvc │    │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────▼────────────────────────────────┐  │
│  │                 Repository (JPA)                          │  │
│  └───────────────┬──────────────────┬─────────────────────────┘  │
│                  │                  │                             │
│           MySQL (RDS)           Redis                           │
│         (영구 데이터)          (세션·캐시)                        │
└─────────────────────────────────────────────────────────────────┘
                  │                           │
           AWS S3 (문서·이미지)        Firebase FCM (푸시)
```

---

## 도메인 모델

```
Brand (브랜드)
 ├── Store (매장)              brandId, storeCode(4자리), 주소, 좌표
 │    └── User (직원)          employeeCode = storeCode + 식별자, role, status
 │         ├── Schedule        PENDING → IN_PROGRESS → DONE
 │         ├── ChatRoomMember
 │         └── Notification    FCM 기반 인앱 알림
 ├── Document                  brandId 기준 공유 (매장 구분 없음)
 ├── ChatRoom                  brandId + (storeId or directRoomKey)
 │    └── Message              senderId, type(TEXT/IMAGE/FILE)
 └── Notice                    pinned, 점장 이상 작성
```

### 역할별 권한 매트릭스

| 기능 | STORE_STAFF | STORE_MANAGER | HQ_STAFF | ADMIN |
|------|:-----------:|:-------------:|:--------:|:-----:|
| 스케줄 조회 | ✅ | ✅ | ✅ | ✅ |
| 스케줄 생성 | ❌ | ✅ | ✅ | ✅ |
| 문서 업로드 | ✅ | ✅ | ✅ | ✅ |
| 문서 수정·삭제 (타인 작성) | ❌ | ❌ | ✅ | ✅ |
| 공지 작성 | ❌ | ✅ | ✅ | ✅ |
| 매장 등록 | ❌ | ❌ | ✅ | ✅ |
| 직원 발급 | ❌ | ❌ | ✅ | ✅ |
| 직원 승인 | ❌ | ✅ (자기 매장) | ❌ | ✅ (전 브랜드) |
| 재고 관리 | ❌ | ✅ | ✅ | ✅ |
| 1:1 채팅 | 같은 매장만 | 매장+본사 | 무제한 | 무제한 |

---

## 로직 흐름

### 1. 인증 흐름 (JWT)

```
클라이언트                          서버
    │                               │
    │── POST /api/auth/login ───────▶  storeCode + employeeCode + password 검증
    │                                  └─ 점별 코드 prefix 일치 확인
    │                                  └─ status = ACTIVE 확인 (PENDING/REJECTED 차단)
    │◀── Access Token (30분) ────────
    │    Refresh Token (HttpOnly Cookie, 7일)
    │
    │── 이후 모든 요청 ──────────────▶  Authorization: Bearer {accessToken}
    │                                  JwtAuthenticationFilter → SecurityContext
    │
    │── 401 응답 수신 ───────────────  Axios 인터셉터 자동 처리
    │── POST /api/auth/refresh ─────▶  RefreshToken Cookie로 재발급
    │◀── 새 Access Token ────────────
    │── 원래 요청 재시도 ─────────────▶
```

### 2. 매장 등록 흐름 (본사 전용)

```
본사 직원 (HQ_STAFF/ADMIN)
    │
    │  1. 카카오 주소 검색
    │── GET /api/stores/addresses/search?query=강남구 ──▶ KakaoAddressSearchService
    │                                                      REST API 키 서버 보관
    │◀── [{ postalCode, roadAddress, lat, lng }]
    │
    │  2. 매장 등록 (점별 코드 자동 발급)
    │── POST /api/stores ─────────────────────────────▶ StoreService.createStore()
    │   { storeName, postalCode, roadAddress, lat, lng }  brandId 내 4자리 랜덤 코드
    │                                                      최대 100회 충돌 재시도
    │◀── { storeCode: "1234", storeName, ... }
    │
    │  3. 직원 발급
    │── POST /api/employees ──────────────────────────▶ UserService.createEmployee()
    │   { storeCode, employeeCode: "1234ABCD!", role }    storeCode prefix 검증
    │                                                      점장 선등록 여부 확인
    │◀── { employeeCode, status: ACTIVE/PENDING }
```

### 3. 직원 승인 흐름

```
본사 발급 ──▶ 매장 직원 계정 생성 (PENDING)
               └─ 해당 매장 점장에게 알림 발송 (FCM)

점장이 앱에서 확인
    │── GET  /api/employees/pending ──▶ 대기 목록 조회
    │
    ├── POST /api/employees/{id}/approve ──▶ status: ACTIVE  → 직원 로그인 가능
    └── POST /api/employees/{id}/reject  ──▶ status: REJECTED + 사유 기록 + 감사 로그
```

### 4. 채팅 브랜드 격리 흐름

```
채팅방 목록 조회
    GET /api/chat/rooms
      └─ findAllByMemberUserIdAndBrandId()
         → 내 brandId 소속 방만 반환 (타 브랜드 완전 차단)

메시지 조회 · 전송
    getMemberRoom() 공통 검사
      ├─ room.brandId ≠ user.brandId  → 403 FORBIDDEN
      └─ 채팅방 멤버 아님              → 403 FORBIDDEN

1:1 채팅방 생성
    POST /api/chat/rooms/direct
      validateDirectRoomPermission()
        ├─ 다른 브랜드 → DIRECT_ROOM_NOT_ALLOWED
        ├─ STORE_STAFF:    다른 매장 → 거부
        └─ STORE_MANAGER:  같은 매장 or HQ_STAFF → 허용

그룹 채팅방 생성
    POST /api/chat/rooms
      validateGroupRoomMember()
        └─ 브랜드·매장 다른 멤버 → 403

STOMP 실시간 메시지
    [CONNECT, Authorization: Bearer {token}]
    [SEND /app/chat.send] ──▶ ChatWebSocketController
    [BROADCAST /topic/room.{roomId}] ──▶ 구독자 전체
```

### 5. 문서 업로드 흐름 (S3 Presigned URL)

```
클라이언트                    서버                    AWS S3
    │                          │                        │
    │  POST /api/documents/presigned                    │
    │  { fileName, contentType }                        │
    │◀── { uploadUrl, s3Key }                           │
    │                          │                        │
    │  PUT {uploadUrl} ─────────────────────────────────▶  클라이언트가 S3 직접 업로드
    │◀── 200 OK ────────────────────────────────────────│
    │                          │                        │
    │  POST /api/documents                              │
    │  { title, s3Key, category, ... }                  │
    │  ──────────────────────▶ 메타데이터만 DB 저장       │
    │◀── DocumentResponse                               │
```

---

## API 명세

> Swagger UI: 서버 기동 후 `http://localhost:8080/swagger-ui.html` 에서 전체 명세 확인

### 인증

| Method | 경로 | 설명 | 권한 |
|--------|------|------|------|
| POST | `/api/auth/login` | 로그인 (JWT 발급) | 공개 |
| POST | `/api/auth/refresh` | Access Token 재발급 | Cookie |
| POST | `/api/auth/logout` | 로그아웃 | 인증 |

### 매장

| Method | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/stores` | 브랜드 내 매장 목록 | HQ+ |
| POST | `/api/stores` | 매장 등록 (코드 자동 발급) | HQ+ |
| PATCH | `/api/stores/{id}/address` | 주소 수정 | HQ+ |
| GET | `/api/stores/nearby` | 좌표 기준 가까운 매장 | 공개 |
| GET | `/api/stores/addresses/search` | 카카오 주소 검색 | 인증 |

### 직원

| Method | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/employees` | 브랜드 직원 목록 | HQ+ |
| POST | `/api/employees` | 직원 계정 발급 | HQ+ |
| GET | `/api/employees/store-members` | 같은 매장 직원 목록 (채팅용) | 인증 |
| GET | `/api/employees/pending` | 승인 대기 목록 | 점장+ |
| POST | `/api/employees/{id}/approve` | 직원 승인 | 점장+ |
| POST | `/api/employees/{id}/reject` | 직원 거절 | 점장+ |

### 채팅

| Method | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/chat/rooms` | 내 채팅방 목록 | 인증 |
| POST | `/api/chat/rooms` | 그룹 채팅방 생성 | 인증 |
| POST | `/api/chat/rooms/direct` | 1:1 채팅방 생성 | 인증 |
| GET | `/api/chat/rooms/{id}/messages` | 메시지 조회 (커서 기반) | 인증 |
| POST | `/api/chat/rooms/{id}/messages` | 메시지 전송 (REST fallback) | 인증 |
| POST | `/api/chat/rooms/{id}/read` | 읽음 처리 | 인증 |
| WS | `/ws/chat` | STOMP 연결 엔드포인트 | JWT |

### 공통 응답 형식

```json
// 성공
{
  "success": true,
  "data": { "..." },
  "message": "OK",
  "timestamp": "2026-01-01T12:00:00Z"
}

// 실패
{
  "success": false,
  "error": {
    "code": "STORE_001",
    "message": "매장을 찾을 수 없습니다."
  },
  "timestamp": "2026-01-01T12:00:00Z"
}
```

---

## 로컬 개발 환경 설정

### 사전 요구 사항

| 도구 | 버전 | 확인 명령 |
|------|------|-----------|
| Java | 17+ | `java -version` |
| Node.js | 18+ | `node -v` |
| Docker | 24+ | `docker -v` |
| Docker Compose | 2+ | `docker compose version` |

---

### 1단계 — 인프라 기동 (MySQL · Redis)

```bash
# 프로젝트 루트에서 실행
docker compose up -d
# MySQL: localhost:3306  (ID: root / PW: 1234 / DB: flowre)
# Redis: localhost:6379
```

직접 실행하는 경우:

```bash
docker run -d --name flowre-mysql \
  -e MYSQL_ROOT_PASSWORD=1234 -e MYSQL_DATABASE=flowre \
  -p 3306:3306 mysql:8

docker run -d --name flowre-redis -p 6379:6379 redis:7
```

---

### 2단계 — 백엔드 실행

```bash
cd server

# 기본 실행
./gradlew bootRun

# 재고 초기 데이터 로드를 건너뛸 때 (시작 속도 개선)
FLOWRE_INVENTORY_AUTO_LOAD=false ./gradlew bootRun
```

서버가 올라오면 **부트스트랩 관리자 계정**이 자동 생성됩니다.

| 항목 | 값 |
|------|----|
| 점별 코드 | `0000` |
| 직원 아이디 | `0000ADMN!` |
| 비밀번호 | `flowre-admin-1234!` |
| 역할 | `ADMIN` |

> Swagger UI: http://localhost:8080/swagger-ui.html

---

### 3단계 — 프론트엔드 실행

```bash
cd client
npm install

npm run start     # Expo 개발 서버 (웹·iOS·Android)
npm run ios       # iOS 시뮬레이터
npm run android   # Android 에뮬레이터
```

> **실기기 테스트**: `client/src/api/client.ts`의 `baseURL`을 `localhost` 대신  
> 서버 LAN IP(`192.168.x.x:8080`)로 변경하세요.

---

### 4단계 — 카카오 주소 검색 설정 (선택)

매장 등록 화면의 주소 검색 기능은 카카오 REST API 키가 필요합니다.

1. [카카오 Developers](https://developers.kakao.com) → 내 애플리케이션 → REST API 키 복사
2. `server/src/main/resources/application.yml` 에 추가:
   ```yaml
   flowre:
     kakao:
       rest-api-key: 여기에_REST_API_키_입력
   ```
   또는 환경변수로 주입:
   ```bash
   KAKAO_REST_API_KEY=your_key ./gradlew bootRun
   ```

> 키가 없어도 앱의 다른 기능은 모두 정상 동작합니다.

---

## 환경 변수

### 백엔드

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `DB_URL` | `jdbc:mysql://localhost:3306/flowre` | MySQL 연결 URL |
| `DB_USERNAME` | `root` | DB 사용자 |
| `DB_PASSWORD` | `1234` | DB 비밀번호 |
| `JWT_SECRET` | `flowre-secret-key-...` | JWT 서명 키 (256bit 이상) |
| `AWS_ACCESS_KEY_ID` | — | S3 접근 키 |
| `AWS_SECRET_ACCESS_KEY` | — | S3 시크릿 키 |
| `AWS_REGION` | `ap-northeast-2` | S3 리전 |
| `AWS_S3_BUCKET` | `flowre-bucket` | S3 버킷명 |
| `KAKAO_REST_API_KEY` | — | 카카오 로컬 API 키 |
| `FLOWRE_ADMIN_PASSWORD` | `flowre-admin-1234!` | 관리자 초기 비밀번호 |
| `FLOWRE_ADMIN_ENABLED` | `true` | 관리자 자동 생성 여부 |
| `FLOWRE_INVENTORY_AUTO_LOAD` | `true` | 재고 초기 데이터 자동 로드 |

> 운영 환경에서는 모든 기본값을 환경변수로 반드시 덮어씁니다.

---

## 프로젝트 구조

```
flowre/
├── server/                          # Spring Boot 백엔드
│   └── src/main/java/com/flowre/
│       ├── domain/
│       │   ├── auth/                # JWT 인증·인가, Security 설정
│       │   ├── user/                # 직원 계정 (등록·승인·역할)
│       │   ├── store/               # 매장 등록·주소 검색·근처 매장
│       │   ├── schedule/            # 스케줄 CRUD·완료 처리
│       │   ├── document/            # 문서 업로드 (S3 Presigned URL)
│       │   ├── chat/                # 채팅 REST + STOMP WebSocket
│       │   ├── notice/              # 공지 (점장 이상 작성)
│       │   ├── favorite/            # 즐겨찾기
│       │   ├── inventory/           # 재고 관리 (낙관적 락)
│       │   ├── notification/        # 인앱 알림
│       │   └── audit/               # 감사 로그 (Audit Trail)
│       └── global/
│           ├── config/              # Security·Redis·WebSocket 설정
│           ├── exception/           # 공통 예외 처리 (ErrorCode enum)
│           ├── response/            # ApiResponse 공통 포맷
│           └── util/                # JWT 유틸
│
└── client/                          # React Native (Expo) 프론트엔드
    └── src/
        ├── screens/
        │   ├── auth/                # 로그인
        │   ├── home/                # 대시보드 (요약·공지·즐겨찾기)
        │   ├── schedule/            # 목록·상세·등록
        │   ├── document/            # 목록·뷰어·업로드
        │   ├── chat/                # 채팅방 목록·채팅 화면
        │   ├── notice/              # 공지 목록·상세·작성
        │   └── inventory/           # 재고 목록·조정
        ├── components/              # 공통 UI (AppHeader, Badge, Card ...)
        ├── api/                     # Axios 인스턴스·API 함수
        ├── store/                   # Zustand 상태 (auth·schedule·chat ...)
        ├── hooks/                   # 커스텀 훅 (useStompChat, useResponsive)
        ├── constants/               # 디자인 토큰 (Colors, Spacing, FontSize)
        └── navigation/              # React Navigation 설정
```

---

## 개발 가이드

### 커밋 메시지 규칙

```
feat: 스케줄 완료 처리 API 추가
fix: 채팅 안읽음 카운트 N+1 문제 해결
refactor: UserRole 정책 메서드 중앙화
test: StoreService 단위 테스트 추가
docs: README 작성
```

### 브랜치 전략

```
main          ← 배포 브랜치 (직접 push 금지, PR 필수)
  └── feat/기능명   ← 기능 브랜치
  └── fix/버그명    ← 버그 수정 브랜치
```

### 브랜드 격리 개발 원칙

새 기능을 추가할 때 반드시 아래 항목을 확인합니다.

- [ ] 조회 쿼리에 `brandId` 조건 포함
- [ ] 서비스 레이어에서 `user.getBrandId()` 기준 데이터 필터링
- [ ] 타 브랜드 데이터 접근 시 `FORBIDDEN (AUTH_006)` 예외 반환
- [ ] 신규 에러 코드는 `ErrorCode` enum에 등록 후 사용

---

## 테스트

### 백엔드

```bash
cd server

# 전체 테스트
./gradlew test

# 도메인별 실행
./gradlew test --tests "com.flowre.server.domain.store.service.*"
./gradlew test --tests "com.flowre.server.domain.chat.service.ChatServiceTest"
./gradlew test --tests "com.flowre.server.domain.document.service.DocumentServiceTest"
```

### 프론트엔드

```bash
cd client

# 전체 테스트
npx jest --watchAll=false

# 파일별 실행
npx jest storeApi --watchAll=false
npx jest chatApi  --watchAll=false
```

### 주요 테스트 커버리지

| 테스트 | 검증 내용 |
|--------|-----------|
| `StoreServiceTest` | 매장 등록·코드 소진·권한 검증·근처 매장 정렬 |
| `KakaoAddressSearchServiceTest` | API 키 누락·오류 응답·주소 및 좌표 파싱 |
| `ChatServiceTest` | 브랜드 격리·배치 N+1 제거·방 생성 권한 |
| `DocumentServiceTest` | 브랜드 격리·소유자 권한·본사 override |
| `storeApi.test.ts` | 매장 CRUD·주소 검색·근처 매장 API 계약 |
| `chatApi.test.ts` | 채팅 API 계약·그룹 생성·멤버 조회·에러 처리 |
| `homePermissions.test.ts` | 역할별 화면 접근 권한 |

---

<div align="center">

© 2026 Flowre · 입점 매장 통합 업무관리 플랫폼

</div>
