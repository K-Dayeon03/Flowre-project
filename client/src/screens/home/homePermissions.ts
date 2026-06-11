import { UserRole } from '../../store/useAuthStore';

/** 매장 등록 화면 접근 권한이 있는 역할인지 확인합니다. */
export function canManageStores(role?: UserRole) {
  return role === 'ADMIN' || role === 'HQ_STAFF';
}

/** 직원 계정 등록 화면 접근 권한이 있는 역할인지 확인합니다. (본사 전용) */
export function canRegisterEmployees(role?: UserRole) {
  return role === 'ADMIN' || role === 'HQ_STAFF';
}
