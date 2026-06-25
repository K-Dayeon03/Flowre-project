# 데이터 사전 — Flowre (플로우리)

> 설계 둘째 산출물. [요구사항](01-requirements.md)에 나온 용어를 표준화하고,
> 저장할 데이터 항목을 또렷이 정의한다.
> "사람마다 다르게 부르는 말"을 하나로 맞추는 단계 — 이게 흔들리면 뒤(ERD·DDL)가 다 흔들린다.

---

## 1. 용어 정의

| 용어 | 정의 |
|------|------|
| 브랜드(Brand) | 입점 브랜드 단위(예: 폴로, 닥스). 모든 데이터의 **최상위 격리 기준**. `brandId`로 참조됨 (별도 JPA 엔티티 없음, 외부 관리). |
| 매장(Store) | 브랜드의 특정 점포. 직원·스케줄·재고가 매장 단위로 관리됨. 4자리 고유 코드로 식별. |
| 직원(User) | 매장 또는 본사에 소속된 Flowre 앱 사용자. 역할(Role)에 따라 접근 권한이 구분됨. |
| 스케줄(Schedule) | 매장 담당자에게 부여된 업무 지시. 유형·상태·마감일·담당자를 가진 *행위 문서*. |
| 문서(Document) | AWS S3에 저장된 파일(매뉴얼·공지·리포트). 브랜드 내 전 직원이 열람 가능. |
| 공지(Notice) | 브랜드 내 전 매장에 공유되는 텍스트 공지. 핀 고정으로 상단 노출 가능. |
| 채팅방(ChatRoom) | GROUP(매장 전체) 또는 DIRECT(1:1) 채팅 공간. 브랜드 단위로 격리됨. |
| 채팅 멤버(ChatRoomMember) | 채팅방에 참여 중인 직원과 마지막 읽은 시각을 연결하는 관계. |
| 메시지(Message) | 채팅방 내 전송되는 단위. TEXT·IMAGE·FILE 세 유형. |
| 재고 항목(InventoryItem) | 매장이 보유한 개별 상품의 수량·속성 정보. **실시간**과 **보관함(archived)** 두 상태로 구분됨. |
| 보관함(Archive) | 실시간 재고에서 분리된 보관용 재고. 원본 항목에서 수량을 차감 후 별도 행으로 생성. 해제 시 원본에 수량 복원. |
| 재고 라벨(InventoryLabel) | 보관함 항목을 분류하는 사용자 정의 태그 (예: VM 스테이징, VIP 예약, 이월 재고). |
| 재고 이력(InventoryTransaction) | 재고 차감·증감이 발생한 사건 기록. 변경 전후 수량은 아니지만 변경량·잔량 보관. |
| 즐겨찾기(Favorite) | 사용자가 자주 쓰는 메뉴·문서·스케줄·채팅방에 빠르게 접근하기 위한 북마크. |
| 인앱 알림(Notification) | 수신자에게 앱 내에서 전달되는 단건 알림. FCM 푸시와 별개로 인앱 알림함에서 관리. |
| 감사 로그(AuditLog) | 민감 작업(재고 차감·직원 승인 등)의 **불변 실행 이력**. 누가·언제·무엇을 했는지 추적용. |

---

## 2. 데이터 항목

### users (직원)

| 항목 | 컬럼 | 형식 | 규칙 |
|------|------|------|------|
| 직원 ID | id | BIGINT (자동) | PK·필수 |
| 이메일 | email | VARCHAR | **UNIQUE**·필수 |
| 직원코드 | employee_code | VARCHAR | **UNIQUE**·필수 (HQ 발급) |
| 비밀번호 | password | VARCHAR | BCrypt 해시·필수 |
| 이름 | name | VARCHAR | 필수 |
| 역할 | role | ENUM | STORE_STAFF / STORE_MANAGER / HQ_STAFF / ADMIN |
| 계정 상태 | status | ENUM | ACTIVE / PENDING / REJECTED (기본값 ACTIVE) |
| 발급자 ID | registered_by_id | BIGINT | 계정 발급한 HQ 직원 ID (선택) |
| 결재자 ID | decided_by_id | BIGINT | 승인·거절한 점장 ID (선택) |
| 결재 시각 | decided_at | DATETIME | 승인·거절 시각 (선택) |
| 거절 사유 | reject_reason | VARCHAR | REJECTED일 때 사유 (선택) |
| 브랜드 ID | brand_id | BIGINT | 소속 브랜드·필수 (격리 기준) |
| 매장 ID | store_id | BIGINT | 소속 매장·필수 |
| 매장 코드 | store_code | VARCHAR | 비정규화 저장·필수 |
| 매장명 | store_name | VARCHAR | 비정규화 저장·필수 |
| FCM 토큰 | fcm_token | VARCHAR | 푸시 알림용 (선택) |
| 코드 로테이션 시각 | code_rotated_at | DATETIME | 마지막 코드 변경 시각 (선택) |
| 생성 시각 | created_at | DATETIME | 자동 |

> **★ storeCode·storeName 비정규화**: 조회 성능 우선 설계. 매장명 변경 시 users 테이블도 일괄 갱신 필요.

---

### stores (매장)

| 항목 | 컬럼 | 형식 | 규칙 |
|------|------|------|------|
| 매장 ID | id | BIGINT (자동) | PK·필수 |
| 브랜드 ID | brand_id | BIGINT | 필수 |
| 매장 코드 | store_code | VARCHAR(4) | 브랜드 내 **UNIQUE**·필수 |
| 매장명 | store_name | VARCHAR | 필수 |
| 우편번호 | postal_code | VARCHAR(5) | 선택 |
| 도로명 주소 | road_address | VARCHAR | 선택 |
| 지번 주소 | jibun_address | VARCHAR | 선택 |
| 상세 주소 | detail_address | VARCHAR | 선택 |
| 위도 | latitude | DOUBLE | 선택 (근처 매장 조회용) |
| 경도 | longitude | DOUBLE | 선택 |
| 활성 여부 | active | BOOLEAN | 기본값 true |
| 운영 상태 | operation_status | ENUM | OPEN / CLOSED (기본값 CLOSED) |
| 생성 시각 | created_at | DATETIME | 자동 |
| 수정 시각 | updated_at | DATETIME | 자동 |

---

### schedules (스케줄)

| 항목 | 컬럼 | 형식 | 규칙 |
|------|------|------|------|
| 스케줄 ID | id | BIGINT (자동) | PK·필수 |
| 제목 | title | VARCHAR | 필수 |
| 유형 | type | ENUM | MANNEQUIN / HQ_VISIT / VM_CHECK / OTHER |
| 상태 | status | ENUM | PENDING / IN_PROGRESS / DONE (기본값 PENDING) |
| 마감일 | due_date | DATETIME | 필수 |
| 담당자명 | assignee | VARCHAR | 비정규화·선택 |
| 매장 ID | store_id | BIGINT | 필수 |
| 브랜드 ID | brand_id | BIGINT | 필수 (격리 기준) |
| 내용 | description | TEXT | 선택 |
| 생성자명 | created_by | VARCHAR | 비정규화·필수 |
| 생성 시각 | created_at | DATETIME | 자동 |

> **assignee·created_by 비정규화**: 담당자명을 ID가 아닌 이름으로 직접 저장해 조회 JOIN 제거.

---

### documents (문서)

| 항목 | 컬럼 | 형식 | 규칙 |
|------|------|------|------|
| 문서 ID | id | BIGINT (자동) | PK·필수 |
| 제목 | title | VARCHAR | 필수 |
| S3 키 | s3_key | VARCHAR | S3 오브젝트 경로·필수 |
| 카테고리 | category | ENUM | MANUAL / NOTICE / REPORT |
| 업로더 ID | uploader_id | BIGINT | 필수 |
| 업로더명 | uploader | VARCHAR | 비정규화·필수 |
| 브랜드 ID | brand_id | BIGINT | 필수 (격리 기준, 매장 단위 격리 없음) |
| 설명 | description | VARCHAR | 선택 |
| 파일 유형 | file_type | VARCHAR | MIME 타입 (예: application/pdf) |
| 파일 크기 | file_size | BIGINT | bytes 단위·선택 |
| 생성 시각 | created_at | DATETIME | 자동 |

---

### notices (공지)

| 항목 | 컬럼 | 형식 | 규칙 |
|------|------|------|------|
| 공지 ID | id | BIGINT (자동) | PK·필수 |
| 브랜드 ID | brand_id | BIGINT | 필수 |
| 제목 | title | VARCHAR | 필수 |
| 내용 | content | TEXT | 선택 |
| 핀 고정 | pinned | BOOLEAN | 기본값 false |
| 작성자 ID | author_id | BIGINT | 선택 |
| 작성자명 | author_name | VARCHAR | 비정규화·선택 |
| 생성 시각 | created_at | DATETIME | 자동 |
| 수정 시각 | updated_at | DATETIME | 자동 |

### notice_reads (공지 읽음)

| 항목 | 컬럼 | 형식 | 규칙 |
|------|------|------|------|
| ID | id | BIGINT (자동) | PK |
| 공지 ID | notice_id | BIGINT | FK → notices |
| 직원 ID | user_id | BIGINT | FK → users |
| 읽은 시각 | read_at | DATETIME | 자동 |

> (notice_id, user_id) UNIQUE — 한 직원이 같은 공지를 중복 읽음 처리 불가.

---

### chat_rooms (채팅방)

| 항목 | 컬럼 | 형식 | 규칙 |
|------|------|------|------|
| 채팅방 ID | id | BIGINT (자동) | PK·필수 |
| 유형 | type | ENUM | GROUP / DIRECT |
| 브랜드 ID | brand_id | BIGINT | 필수 (격리 기준) |
| 매장 ID | store_id | BIGINT | GROUP일 때 매장 ID, DIRECT일 때 NULL |
| 채팅방명 | name | VARCHAR | GROUP: 매장명, DIRECT: 상대방 이름 |
| 1:1 채팅 키 | direct_room_key | VARCHAR | **UNIQUE** — 두 사용자 ID를 정렬 조합해 생성 (예: "12:34") |
| 생성 시각 | created_at | DATETIME | 자동 |

### chat_room_members (채팅방 멤버)

| 항목 | 컬럼 | 형식 | 규칙 |
|------|------|------|------|
| ID | id | BIGINT (자동) | PK |
| 채팅방 ID | chat_room_id | BIGINT | FK → chat_rooms |
| 직원 ID | user_id | BIGINT | 참조 |
| 직원명 | user_name | VARCHAR | 비정규화·필수 |
| 마지막 읽은 시각 | last_read_at | DATETIME | NULL이면 한 번도 읽지 않음 |

> (chat_room_id, user_id) UNIQUE — 같은 채팅방에 같은 직원 중복 입장 불가.

### messages (메시지)

| 항목 | 컬럼 | 형식 | 규칙 |
|------|------|------|------|
| 메시지 ID | id | BIGINT (자동) | PK·필수 |
| 채팅방 ID | room_id | BIGINT | 참조 |
| 발신자 ID | sender_id | BIGINT | 참조 |
| 발신자명 | sender_name | VARCHAR | 비정규화·필수 |
| 내용 | content | TEXT | 필수 |
| 파일명 | file_name | VARCHAR | IMAGE/FILE 유형일 때 원본 파일명 |
| 메시지 유형 | type | ENUM | TEXT / IMAGE / FILE |
| 전송 시각 | sent_at | DATETIME | 자동 |
| 읽은 시각 | read_at | DATETIME | 선택 |

---

### inventory_items (재고 항목)

| 항목 | 컬럼 | 형식 | 규칙 |
|------|------|------|------|
| 항목 ID | id | BIGINT (자동) | PK·필수 |
| 낙관적 락 버전 | version | BIGINT | 동시성 제어용 |
| 브랜드 ID | brand_id | BIGINT | 필수 |
| 매장 ID | store_id | BIGINT | 필수 |
| 매장 코드 | store_code | VARCHAR | 비정규화 |
| 매장명 | store_name | VARCHAR | 비정규화 |
| 상품 코드 | product_code | VARCHAR | 필수 |
| 색상 코드 | color_code | VARCHAR | 선택 |
| 색상명 | color_name | VARCHAR | 선택 |
| 사이즈명 | size_name | VARCHAR | 선택 |
| 상품명 | product_name | VARCHAR | 필수 |
| 카테고리 | category | ENUM | 상품명 키워드로 자동 분류 (JACKET/DRESS/SKIRT/OUTER/PANTS/BLOUSE/KNIT/TSHIRT/ETC) |
| 바코드 | barcode | VARCHAR | 선택 |
| 소스 코드 | source_code | VARCHAR | 선택 |
| 팩 수량 | pack_quantity | INT | 선택 |
| 정가 | normal_price | INT | 선택 |
| 판매가 | retail_price | INT | 선택 |
| 수량 | quantity | INT | 필수 |
| 보관함 여부 | archived | BOOLEAN | 기본값 false. true이면 보관함 항목 |
| 원본 항목 ID | source_item_id | BIGINT | 보관 시 분리된 원본 항목 ID (선택) |
| 보관 라벨 ID | archive_label_id | BIGINT | FK → inventory_labels (보관 시) |
| 보관 시각 | archived_at | DATETIME | 선택 |
| 보관 처리자 | archived_by | VARCHAR | 보관 처리한 직원명·선택 |
| 보관 재고명 | archive_item_name | VARCHAR | 선택 |
| 보관 재고 코드 | archive_item_code | VARCHAR | 선택 |
| 보관 수량 | archive_quantity | INT | 선택 |
| 생성 시각 | created_at | DATETIME | 자동 |
| 수정 시각 | updated_at | DATETIME | 자동 |

> **★ 실시간 vs 보관함 구분이 핵심.** 보관 시 원본 항목의 수량을 줄이고 archived=true인 새 행을 생성. 해제 시 원본 수량 복원 후 보관 행 삭제.

### inventory_labels (보관 라벨)

| 항목 | 컬럼 | 형식 | 규칙 |
|------|------|------|------|
| 라벨 ID | id | BIGINT (자동) | PK |
| 브랜드 ID | brand_id | BIGINT | 필수 |
| 라벨명 | name | VARCHAR(60) | 브랜드 내 **UNIQUE**·필수 |
| 생성 시각 | created_at | DATETIME | 자동 |

### inventory_transactions (재고 이력)

| 항목 | 컬럼 | 형식 | 규칙 |
|------|------|------|------|
| 이력 ID | id | BIGINT (자동) | PK |
| 브랜드 ID | brand_id | BIGINT | 필수 |
| 매장 ID | store_id | BIGINT | 필수 |
| 재고 항목 ID | inventory_item_id | BIGINT | 참조 |
| 상품 코드 | product_code | VARCHAR | 비정규화 |
| 상품명 | product_name | VARCHAR | 비정규화 |
| 변경 수량 | quantity | INT | 필수 (음수=차감, 양수=증가) |
| 잔여 수량 | remaining_quantity | INT | 변경 후 잔량·필수 |
| 사유 | reason | VARCHAR | 선택 |
| 처리자 ID | used_by_id | BIGINT | 필수 |
| 처리자명 | used_by_name | VARCHAR | 비정규화·필수 |
| 생성 시각 | created_at | DATETIME | 자동 |

---

### favorites (즐겨찾기)

| 항목 | 컬럼 | 형식 | 규칙 |
|------|------|------|------|
| 즐겨찾기 ID | id | BIGINT (자동) | PK |
| 직원 ID | user_id | BIGINT | 필수 |
| 대상 유형 | target_type | ENUM | MENU / DOCUMENT / SCHEDULE / CHAT_ROOM |
| 대상 ID | target_id | BIGINT | 문서·스케줄·채팅방의 ID (선택, MENU일 때 NULL) |
| 대상 키 | target_key | VARCHAR | MENU일 때 메뉴 식별자 (예: SCHEDULE, CHAT) |
| 라벨 | label | VARCHAR | 즐겨찾기 표시명·선택 |
| 생성 시각 | created_at | DATETIME | 자동 |

> (user_id, target_type, target_id, target_key) UNIQUE — 같은 항목을 중복 즐겨찾기 불가.

---

### notifications (인앱 알림)

| 항목 | 컬럼 | 형식 | 규칙 |
|------|------|------|------|
| 알림 ID | id | BIGINT (자동) | PK |
| 브랜드 ID | brand_id | BIGINT | 필수 |
| 수신자 ID | recipient_id | BIGINT | 필수 |
| 알림 유형 | type | ENUM | APPROVAL_REQUEST / SCHEDULE_DUE / INVENTORY_LOW / GENERAL |
| 제목 | title | VARCHAR | 필수 |
| 내용 | message | TEXT | 선택 |
| 연관 리소스 유형 | related_type | VARCHAR | 예: SCHEDULE, INVENTORY_ITEM (선택) |
| 연관 리소스 ID | related_id | BIGINT | 알림 탭 시 이동할 화면 특정용 (선택) |
| 읽음 여부 | is_read | BOOLEAN | 기본값 false |
| 생성 시각 | created_at | DATETIME | 자동 |

---

### audit_logs (감사 로그)

| 항목 | 컬럼 | 형식 | 규칙 |
|------|------|------|------|
| 로그 ID | id | BIGINT (자동) | PK |
| 브랜드 ID | brand_id | BIGINT | 필수 |
| 행위자 ID | actor_id | BIGINT | 필수 |
| 행위자명 | actor_name | VARCHAR | 비정규화·필수 |
| 행위 유형 | action | ENUM | SCHEDULE_COMPLETED / INVENTORY_DEDUCTED / INVENTORY_ADJUSTED / EMPLOYEE_APPROVED / EMPLOYEE_REJECTED / EMPLOYEE_UPDATED / EMPLOYEE_DELETED |
| 대상 리소스 유형 | target_type | VARCHAR | 예: SCHEDULE, INVENTORY_ITEM (선택) |
| 대상 리소스 ID | target_id | BIGINT | 선택 |
| 상세 설명 | detail | TEXT | 사람이 읽을 수 있는 부가 설명 |
| 생성 시각 | created_at | DATETIME | 자동 |

---

## 3. Enum 정의 요약

| Enum | 값 |
|------|----|
| UserRole | STORE_STAFF, STORE_MANAGER, HQ_STAFF, ADMIN |
| UserStatus | ACTIVE, PENDING, REJECTED |
| StoreOperationStatus | OPEN, CLOSED |
| ScheduleType | MANNEQUIN, HQ_VISIT, VM_CHECK, OTHER |
| ScheduleStatus | PENDING, IN_PROGRESS, DONE |
| DocumentCategory | MANUAL, NOTICE, REPORT |
| RoomType (채팅방) | GROUP, DIRECT |
| MessageType | TEXT, IMAGE, FILE |
| ProductCategory | JACKET, DRESS, SKIRT, OUTER, PANTS, BLOUSE, KNIT, TSHIRT, ETC |
| FavoriteTargetType | DOCUMENT, SCHEDULE, CHAT_ROOM, MENU |
| NotificationType | APPROVAL_REQUEST, SCHEDULE_DUE, INVENTORY_LOW, GENERAL |
| AuditAction | SCHEDULE_COMPLETED, INVENTORY_DEDUCTED, INVENTORY_ADJUSTED, EMPLOYEE_APPROVED, EMPLOYEE_REJECTED, EMPLOYEE_UPDATED, EMPLOYEE_DELETED |

---

## 4. 관계 미리 보기 (ERD에서 확정)

- stores N — 1 Brand (brandId로 묵시적 참조)
- users N — 1 stores (storeId, 단방향 Long 참조)
- notices 1 — N notice_reads
- chat_rooms 1 — N chat_room_members (CascadeType.ALL, orphanRemoval)
- chat_rooms 1 — N messages (roomId로 참조)
- inventory_items N — 1 inventory_labels (archiveLabel, LAZY FK)
- inventory_items 1 — N inventory_transactions (inventoryItemId 참조)

> 대부분의 참조는 JPA FK가 아닌 **Long ID 보관** 방식 — 성능·격리 우선 설계. ERD에서 논리적 FK로 표현.

> 다음 단계 → [ERD](03-erd.md)에서 엔티티와 관계를 다이어그램으로 표현한다.
