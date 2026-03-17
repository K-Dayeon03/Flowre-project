# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project: Flowre (플로우리)

## Overview
신세계까사 JAJU 매장 직원 전용 통합 업무 관리 앱 — 스케줄·문서·채팅을 하나의 플랫폼에서 처리

---

## Tech Stack

### Backend
- Language: Java 17
- Framework: Spring Boot 3.x
- Database: MySQL 8 (RDS) + Redis (캐시·세션)
- ORM: JPA / Hibernate
- Auth: JWT (Access Token 30분 + Refresh Token 7일) + Spring Security
- WebSocket: STOMP over WebSocket (채팅)
- Storage: AWS S3 (문서·이미지)
- Push: Firebase FCM (Android·iOS 통합)
- Deploy: AWS EC2 + Docker + GitHub Actions CI/CD

### Frontend
- Framework: React Native (Expo)
- Language: TypeScript
- State: Zustand
- HTTP: Axios (인터셉터로 토큰 자동 갱신)
- WebSocket: STOMP.js
- Push: Expo Notifications + FCM

---

## Screen Structure

```
screens/
├── auth/
│   └── LoginScreen          # 이메일·비밀번호 로그인
├── home/
│   └── HomeScreen           # 요약 카드(스케줄·문서·채팅) + 오늘 스케줄 + 최근 공지
├── schedule/
│   ├── ScheduleListScreen   # 필터 탭(전체·대기·진행중·완료) + 카드 목록 + FAB
│   ├── ScheduleDetailScreen # 상태 배너·메타 정보·내용·완료 처리 버튼
│   └── ScheduleCreateScreen # 유형 선택·제목·마감일·담당자·내용 폼
├── document/
│   ├── DocumentListScreen   # 카테고리 탭(매뉴얼·공지·리포트) + 파일 목록 + FAB
│   ├── DocumentDetailScreen # 파일 미리보기·메타 정보·다운로드 버튼
│   └── DocumentUploadScreen # 파일 선택(Presigned URL) + 카테고리·제목·설명 폼
└── chat/
    ├── ChatRoomListScreen   # 검색바 + 채팅방 목록(GROUP·DIRECT 구분) + 안읽음 뱃지
    └── ChatRoomScreen       # 말풍선 UI + 날짜 구분선 + 첨부 버튼 + STOMP 연동

Navigation:
RootStack → AuthStack (Login) | MainTab
MainTab → HomeTab | ScheduleStack | DocumentStack | ChatStack
```

### Theme (`/client/src/constants/theme.ts`)
- `Colors` — primary(#2D2D2D), accent(#C8A97E), scheduleType별 색상, statusBadge별 색상
- `Spacing`, `FontSize`, `Radius` — 전역 디자인 토큰

---

## Project Structure

### Backend (`/server`)
```
server/
├── src/main/java/com/flowre/
│   ├── domain/
│   │   ├── auth/          # JWT 인증·인가, Security 설정
│   │   ├── user/          # 회원 (매장직원·본사직원)
│   │   ├── schedule/      # 스케줄 CRUD·완료 처리
│   │   ├── document/      # 문서 업로드·목록 (S3 연동)
│   │   └── chat/          # 채팅 REST API + STOMP WebSocket
│   ├── global/
│   │   ├── config/        # Security, S3, Redis, FCM 설정
│   │   ├── exception/     # 공통 예외 처리
│   │   ├── response/      # 공통 API 응답 포맷
│   │   └── util/          # JWT 유틸, S3 업로드 유틸
│   └── FlowreApplication.java
└── src/main/resources/
    ├── application.yml
    └── application-prod.yml
```

### Frontend (`/client`)
```
client/
├── src/
│   ├── screens/
│   │   ├── auth/          # 로그인 화면
│   │   ├── home/          # 홈 (공지·요약)
│   │   ├── schedule/      # 스케줄 목록·상세·등록
│   │   ├── document/      # 문서 목록·업로드·뷰어
│   │   └── chat/          # 채팅방 목록·채팅 화면
│   ├── components/        # 공통 UI 컴포넌트
│   ├── store/             # Zustand 상태 (auth, schedule, chat)
│   ├── api/               # Axios 인스턴스·API 함수
│   ├── hooks/             # 커스텀 훅
│   └── utils/             # 날짜 포맷, 파일 처리 등
└── app.json
```

---

## Domain Models

### User (회원)
| 필드 | 타입 | 설명 |
|------|------|------|
| id | Long | PK |
| email | String | 로그인 ID |
| role | Enum | STORE_STAFF / STORE_MANAGER / HQ_STAFF / ADMIN |
| brandId | Long | 소속 브랜드 (JAJU 등) |
| storeId | Long | 소속 매장 |

### Schedule (스케줄)
| 필드 | 타입 | 설명 |
|------|------|------|
| id | Long | PK |
| title | String | 제목 |
| type | Enum | MANNEQUIN / HQ_VISIT / VM_CHECK / OTHER |
| status | Enum | PENDING / IN_PROGRESS / DONE |
| dueDate | LocalDateTime | 마감일 |
| assigneeId | Long | 담당자 |
| storeId | Long | 대상 매장 |

### Document (문서)
| 필드 | 타입 | 설명 |
|------|------|------|
| id | Long | PK |
| title | String | 문서명 |
| s3Key | String | S3 경로 |
| category | Enum | MANUAL / NOTICE / REPORT |
| uploaderId | Long | 업로더 |
| brandId | Long | 브랜드 |

### ChatRoom (채팅방)
| 필드 | 타입 | 설명 |
|------|------|------|
| id | Long | PK |
| type | Enum | GROUP / DIRECT |
| storeId | Long | 그룹 채팅 시 매장 기준 (DIRECT는 null) |
| name | String | 채팅방 이름 (그룹: 매장명, 1:1: 상대방 이름) |

### Message (메시지)
| 필드 | 타입 | 설명 |
|------|------|------|
| id | Long | PK |
| roomId | Long | 채팅방 FK |
| senderId | Long | 발신자 |
| content | String | 메시지 내용 |
| type | Enum | TEXT / IMAGE / FILE |
| readAt | LocalDateTime | 읽음 처리 시각 |

**채팅방 규칙**
- `GROUP`: 매장 소속 직원 전원 자동 입장, storeId로 식별
- `DIRECT`: 두 사용자 간 1:1, 중복 생성 방지 (userId 쌍으로 유니크 처리)
  - `STORE_STAFF` (일반 직원): 같은 매장 직원끼리만 1:1 가능
  - `STORE_MANAGER` (점장): 같은 매장 직원 + 본사 직원(HQ_STAFF) 1:1 가능
  - 1:1 채팅방 생성 시 권한 검증 필수 (상대방 role·storeId 확인)

---

## API Rules
- 모든 API 응답에 `timestamp` 필드 포함
- 공통 응답 포맷:
  ```json
  {
    "success": true,
    "data": { ... },
    "message": "OK",
    "timestamp": "2025-01-01T12:00:00Z"
  }
  ```
- 에러 응답:
  ```json
  {
    "success": false,
    "error": { "code": "SCHEDULE_NOT_FOUND", "message": "..." },
    "timestamp": "2025-01-01T12:00:00Z"
  }
  ```
- JWT Access Token은 `Authorization: Bearer {token}` 헤더로 전달
- Refresh Token은 HttpOnly Cookie로 관리

---

## Development Phases

### Phase 1 - MVP
- [x] JWT 로그인·토큰 갱신 API
- [x] 스케줄 CRUD + 완료 처리 API
- [x] 문서 업로드·목록 API (S3 연동)
- [x] 채팅 REST API + STOMP WebSocket
- [x] React Native 로그인·홈·스케줄·문서·채팅 화면
- [x] FCM 푸시 알림 수신
- [x] EC2 + Docker 배포 + GitHub Actions

### Phase 2 - 고도화
- 스케줄 완료 시 본사 자동 보고 리포트
- 채팅 메시지 검색
- 브랜드 추가 확장 (까사미아 등)
- 일정 체크리스트 서브태스크

### Phase 3 - 확장
- 전 매장 현황 대시보드 (본사용)
- 매장별 KPI 리포트 자동 생성
- Google Calendar 연동
- 이메일 파싱 자동 문서 등록

---

## Commands

### Backend
```bash
./gradlew bootRun                        # 개발 서버 실행
./gradlew test                           # 전체 테스트
./gradlew test --tests "*.ScheduleTest"  # 단일 테스트 클래스 실행
./gradlew build                          # 빌드 (JAR)
docker build -t flowre-server .          # Docker 이미지 빌드
```

### Frontend
```bash
npm run start          # Expo 개발 서버
npm run android        # Android 에뮬레이터
npm run ios            # iOS 시뮬레이터
npm run test           # Jest 테스트
npm run test -- --testPathPattern=schedule  # 단일 테스트 파일 실행
npm run build:android  # Android APK/AAB 빌드
```

---

## Code Style Rules
- 커밋 메시지는 한글로 작성 (예: `feat: 스케줄 완료 처리 API 추가`)
- 모든 함수에 JSDoc / JavaDoc 주석 추가
- `console.log` 대신 `logger` 사용 (백엔드: SLF4J, 프론트: 커스텀 logger 유틸)
- 테스트 코드 필수 작성 (백엔드: JUnit5, 프론트: Jest + React Native Testing Library)

---

## Important Notes
- 브랜드별 데이터 격리: 모든 API에서 `brandId` 필터 필수 — 타 브랜드 데이터 노출 방지
- STOMP 채팅 연결 시 JWT 토큰을 STOMP CONNECT 헤더에 포함해 인증 처리
- S3 업로드는 서버에서 Presigned URL을 발급하고 클라이언트가 직접 업로드하는 방식 사용
- FCM 토큰은 로그인 성공 후 서버에 등록, 로그아웃 시 삭제
- Refresh Token 갱신 로직은 Axios 인터셉터에서 401 응답 시 자동 처리
