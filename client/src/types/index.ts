/**
 * 매장통합시스템 도메인 TypeScript 타입 정의입니다.
 * 화면, 스토어, API 계층에서 공유 가능한 타입을 중앙 관리합니다.
 */

// ─────────────────────────────────────────
// 공통 API 응답 타입
// ─────────────────────────────────────────

/** 서버 공통 응답 래퍼 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
  timestamp?: string;
}

/** 페이지네이션 응답 */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  size: number;
}

// ─────────────────────────────────────────
// 사용자 / 인증
// ─────────────────────────────────────────

/** 사용자 역할 */
export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF';

/** 사용자 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  storeId?: string;
  profileImageUrl?: string;
  createdAt: string;
}

/** 로그인 요청 */
export interface LoginRequest {
  email: string;
  password: string;
}

/** 로그인 응답 */
export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
}

// ─────────────────────────────────────────
// 매장
// ─────────────────────────────────────────

/** 매장 운영 상태 */
export type StoreStatus = 'OPEN' | 'CLOSED' | 'BREAK';

/** 매장 */
export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  status: StoreStatus;
  openTime: string;
  closeTime: string;
  managerId?: string;
  createdAt: string;
}

/** 매장 상태 업데이트 요청 */
export interface UpdateStoreStatusRequest {
  status: StoreStatus;
  reason?: string;
}

// ─────────────────────────────────────────
// 재고
// ─────────────────────────────────────────

/** 재고 상태 */
export type StockStatus = 'SUFFICIENT' | 'LOW' | 'OUT_OF_STOCK';

/** 재고 카테고리 */
export type InventoryCategory = 'FOOD' | 'BEVERAGE' | 'SUPPLY' | 'EQUIPMENT' | 'OTHER';

/** 재고 항목 */
export interface InventoryItem {
  id: string;
  storeId: string;
  name: string;
  quantity: number;
  minQuantity: number;
  stockStatus?: StockStatus;
  unit: string;
  category: InventoryCategory;
  lastUpdated: string;
  updatedBy: string;
}

/** 재고 수정 요청 */
export interface UpdateStockRequest {
  quantity: number;
  reason?: string;
}

/** 재고 상태 계산 유틸 */
export const getStockStatus = (item: InventoryItem): StockStatus => {
  if (item.stockStatus) return item.stockStatus;
  if (item.quantity === 0) return 'OUT_OF_STOCK';
  if (item.quantity < item.minQuantity) return 'LOW';
  return 'SUFFICIENT';
};

// ─────────────────────────────────────────
// 매출
// ─────────────────────────────────────────

/** 결제 수단 */
export type PaymentMethod = 'CARD' | 'CASH' | 'TRANSFER' | 'OTHER';

/** 매출 요약 */
export interface SalesSummary {
  storeId: string;
  date: string;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  comparedToPrevious: number;
  paymentBreakdown: Record<PaymentMethod, number>;
}

/** 매출 상세 거래 */
export interface SalesTransaction {
  id: string;
  storeId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  items: SalesItem[];
  createdAt: string;
  cashierId: string;
}

/** 매출 항목 */
export interface SalesItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// ─────────────────────────────────────────
// 직원
// ─────────────────────────────────────────

/** 직원 근무 상태 */
export type EmployeeWorkStatus = 'WORKING' | 'OFF' | 'ON_LEAVE';

/** 직원 */
export interface Employee {
  id: string;
  userId: string;
  storeId: string;
  name: string;
  phone: string;
  role: UserRole;
  workStatus: EmployeeWorkStatus;
  startDate: string;
  hourlyWage?: number;
}

// ─────────────────────────────────────────
// 알림
// ─────────────────────────────────────────

/** 알림 유형 */
export type NotificationType = 'STOCK_LOW' | 'STOCK_OUT' | 'SALES_GOAL_MET' | 'STORE_STATUS_CHANGE' | 'SYSTEM';

/** 알림 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  storeId?: string;
  isRead: boolean;
  createdAt: string;
}

// ─────────────────────────────────────────
// 네비게이션 타입
// ─────────────────────────────────────────

/** 바텀 탭 파라미터 */
export type RootTabParamList = {
  Home: undefined;
  Store: undefined;
  Inventory: undefined;
  Sales: undefined;
  More: undefined;
};

/** 스택 네비게이션 파라미터 */
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  StoreDetail: { storeId: string };
  InventoryDetail: { itemId: string };
  SalesDetail: { storeId: string; date: string };
  EmployeeDetail: { employeeId: string };
  Notifications: undefined;
  Settings: undefined;
};
