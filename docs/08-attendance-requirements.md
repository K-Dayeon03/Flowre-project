# 직원 근태 관리 요구사항

> 목적: 직원의 출근/퇴근 기록과 현재 근무 상태를 앱에서 관리하고, 점장/본사가 확인할 수 있게 한다.

---

## 1. 문제 정의

현재 직원 등록과 승인 흐름은 있지만, 실제 근무 기록은 없다. 점장과 본사는 누가 근무 중인지, 하루 근무 시간이 얼마나 되는지 앱에서 확인할 수 있어야 한다.

급여 자동 계산은 후순위로 두고, P0에서는 출퇴근 기록과 근무 시간 합계까지만 다룬다.

---

## 2. 근무 상태

| 상태 | 설명 |
|------|------|
| WORKING | 출근 처리 후 퇴근 전 |
| OFF | 퇴근 완료 또는 근무 없음 |
| ON_LEAVE | 휴무/휴가 |

---

## 3. 사용자 흐름

### 3.1 직원

1. 앱에서 `출근`을 누른다.
2. 현재 상태가 `근무중`으로 바뀐다.
3. 근무 종료 시 `퇴근`을 누른다.
4. 당일 근무 시간이 표시된다.

### 3.2 점장/본사

1. 직원 목록에서 현재 근무 상태를 확인한다.
2. 날짜별 근무 기록을 조회한다.
3. 직원별 근무 시간 합계를 확인한다.
4. 누락/오입력 기록을 수정할 수 있다.

---

## 4. 서버 요구사항

### 4.1 AttendanceRecord 엔티티

| 필드 | 타입 | 설명 |
|------|------|------|
| id | Long | 근태 ID |
| brandId | Long | 브랜드 격리 기준 |
| storeId | Long | 매장 |
| userId | Long | 직원 |
| workDate | LocalDate | 근무일 |
| clockInAt | LocalDateTime | 출근 시각 |
| clockOutAt | LocalDateTime | 퇴근 시각 |
| status | AttendanceStatus | WORKING / OFF / ON_LEAVE |
| totalMinutes | Integer | 근무 시간 합계 |
| note | String | 수정 사유 또는 메모 |
| createdAt | LocalDateTime | 생성 시각 |
| updatedAt | LocalDateTime | 수정 시각 |

### 4.2 API

| 메서드 | 경로 | 권한 | 설명 |
|--------|------|------|------|
| POST | `/api/attendance/clock-in` | STORE_STAFF 이상 | 출근 |
| POST | `/api/attendance/clock-out` | STORE_STAFF 이상 | 퇴근 |
| GET | `/api/attendance/me` | STORE_STAFF 이상 | 내 근태 조회 |
| GET | `/api/attendance` | STORE_MANAGER / HQ_STAFF / ADMIN | 직원 근태 목록 |
| PATCH | `/api/attendance/{id}` | STORE_MANAGER / HQ_STAFF / ADMIN | 근태 기록 수정 |

### 4.3 검증 정책

- 같은 직원은 같은 날짜에 열린 근무 기록을 두 개 만들 수 없다.
- 퇴근 시각은 출근 시각보다 늦어야 한다.
- STORE_STAFF는 본인 근태만 수정 없이 조회할 수 있다.
- STORE_MANAGER는 본인 매장 직원 근태만 조회/수정할 수 있다.
- HQ_STAFF는 브랜드 내 전체 매장 근태를 조회할 수 있다.

---

## 5. 앱 요구사항

### 5.1 직원 화면

- 출근/퇴근 버튼
- 현재 근무 상태 표시
- 오늘 근무 시간 표시
- 최근 근무 기록 목록

### 5.2 점장/본사 화면

- 직원별 근무 상태 목록
- 날짜 필터
- 매장 필터
- 근무 시간 합계
- 누락 기록 수정 화면

---

## 6. 완료 기준

- 직원이 출근/퇴근을 기록할 수 있다.
- 현재 근무 상태가 직원 목록에 표시된다.
- 날짜별 근무 시간 합계가 계산된다.
- 역할별 조회/수정 권한이 지켜진다.
- 근태 수정은 감사 로그에 남는다.

