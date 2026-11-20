# 모바일 원격 발주 요구사항

> 목적: 재고 부족 항목을 확인한 뒤 앱에서 바로 발주하고, 본사/매장이 진행 상태를 추적할 수 있게 한다.

---

## 1. 문제 정의

재고 부족을 확인해도 현재는 다음 행동이 앱 밖에서 이뤄진다. 전화, 메신저, 수기 요청으로 넘어가면 누락과 중복 발주가 생기기 쉽다.

모바일 원격 발주는 `재고 부족 확인 → 수량 입력 → 예상 금액 확인 → 발주 확정 → 진행 상태 추적`까지 앱 안에서 닫는 기능이다.

---

## 2. 발주 상태

| 상태 | 설명 |
|------|------|
| PREPARING | 본사 또는 물류에서 발주 준비 중 |
| SHIPPING | 배송 중 |
| COMPLETED | 매장 입고 완료 |
| CANCELED | 취소됨 |

화면 표시는 각각 `준비중`, `배송중`, `완료`, `취소`로 한다.

---

## 3. 사용자 흐름

### 3.1 매장 직원/점장

1. 재고 부족 또는 소진 항목을 확인한다.
2. `발주`를 누른다.
3. 발주 수량을 입력한다.
4. 예상 금액을 확인한다.
5. 발주를 확정한다.
6. 발주 목록에서 상태를 확인한다.

### 3.2 본사 직원

1. 전체 매장의 발주 요청을 확인한다.
2. 매장/상태/상품 기준으로 필터링한다.
3. 발주 상태를 `준비중 → 배송중 → 완료`로 변경한다.
4. 필요 시 발주를 취소하고 사유를 남긴다.

---

## 4. 서버 요구사항

### 4.1 Order 엔티티

| 필드 | 타입 | 설명 |
|------|------|------|
| id | Long | 발주 ID |
| brandId | Long | 브랜드 격리 기준 |
| storeId | Long | 요청 매장 |
| inventoryItemId | Long | 연결된 재고 항목 |
| productCode | String | 상품 코드 |
| productName | String | 상품명 |
| orderQuantity | Integer | 발주 수량 |
| unitPrice | Integer | 기준 단가 |
| expectedAmount | Integer | 예상 금액 |
| status | OrderStatus | PREPARING / SHIPPING / COMPLETED / CANCELED |
| requestedById | Long | 요청자 |
| requestedByName | String | 요청자명 |
| canceledReason | String | 취소 사유 |
| createdAt | LocalDateTime | 생성 시각 |
| updatedAt | LocalDateTime | 수정 시각 |

### 4.2 API

| 메서드 | 경로 | 권한 | 설명 |
|--------|------|------|------|
| POST | `/api/orders` | STORE_STAFF 이상 | 발주 생성 |
| GET | `/api/orders` | STORE_STAFF 이상 | 발주 목록 조회 |
| GET | `/api/orders/{id}` | STORE_STAFF 이상 | 발주 상세 조회 |
| PATCH | `/api/orders/{id}/status` | STORE_MANAGER / HQ_STAFF / ADMIN | 발주 상태 변경 |
| PATCH | `/api/orders/{id}/cancel` | STORE_MANAGER / HQ_STAFF / ADMIN | 발주 취소 |

### 4.3 권한

- STORE_STAFF는 본인 매장 발주만 생성/조회한다.
- STORE_MANAGER는 본인 매장 발주를 생성/조회/상태 변경할 수 있다.
- HQ_STAFF와 ADMIN은 브랜드 내 전체 발주를 조회/상태 변경할 수 있다.

---

## 5. 앱 요구사항

### 5.1 재고 화면 연결

- 부족/소진 재고 카드에서 `발주` 버튼을 제공한다.
- 발주 화면으로 상품 정보를 전달한다.

### 5.2 발주 생성 화면

- 상품명, 상품 코드, 현재 수량, 최소 수량을 표시한다.
- 발주 수량 입력 필드를 제공한다.
- 예상 금액을 자동 계산한다.
- 발주 확정 전 확인 모달을 표시한다.

### 5.3 발주 목록 화면

- 상태 탭: 전체 / 준비중 / 배송중 / 완료 / 취소
- 매장명, 상품명, 수량, 예상 금액, 요청자, 요청일 표시
- 본사/점장은 상태 변경 액션 제공

---

## 6. 완료 기준

- 부족/소진 재고에서 발주 생성 화면으로 바로 이동할 수 있다.
- 발주 수량과 예상 금액이 서버에 저장된다.
- 역할별 조회 범위가 지켜진다.
- 상태 변경 이력이 감사 로그에 남는다.
- 발주 상태가 목록과 상세 화면에 동일하게 표시된다.

