import { UserRole } from '../../store/useAuthStore';

/** 매장 등록 화면 접근 권한이 있는 역할인지 확인합니다. */
export function canManageStores(role?: UserRole) {
  return role === 'ADMIN' || role === 'HQ_STAFF';
}

/** 직원 계정 등록 화면 접근 권한이 있는 역할인지 확인합니다. (본사 전용) */
export function canRegisterEmployees(role?: UserRole) {
  return role === 'ADMIN' || role === 'HQ_STAFF';
}

/**
 * 직원 승인 화면 접근 권한이 있는 역할인지 확인합니다.
 * 점장은 자기 매장 직원을, 관리자는 브랜드 전체 직원을 승인할 수 있다.
 */
export function canApproveEmployees(role?: UserRole) {
  return role === 'STORE_MANAGER' || role === 'ADMIN';
}

/** 공지 작성 권한이 있는 역할인지 확인합니다. */
export function canCreateNotices(role?: UserRole) {
  return role === 'ADMIN' || role === 'HQ_STAFF' || role === 'STORE_MANAGER';
}
