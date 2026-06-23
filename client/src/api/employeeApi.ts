import { apiClient, unwrap } from './client';
import { UserRole } from '../store/useAuthStore';

/** 본사가 발급 가능한 직원 권한 (ADMIN 제외) */
export type AssignableRole = Exclude<UserRole, 'ADMIN'>;

/** 직원 계정 승인 상태 */
export type EmployeeStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';

export interface Employee {
  id: number;
  name: string;
  email: string;
  employeeCode: string;
  role: UserRole;
  status: EmployeeStatus;
  rejectReason?: string;
  brandId: number;
  storeId: number;
  storeCode: string;
  storeName: string;
  /** 코드 마지막 로테이션 시각 — null이면 최초 발급 후 아직 순환 안 됨 */
  codeRotatedAt?: string;
  createdAt?: string;
}

export interface EmployeeCreateRequest {
  name: string;
  email: string;
  storeCode: string;
  employeeCode: string;
  password: string;
  role: AssignableRole;
}

export interface EmployeeUpdateRequest {
  name: string;
  email: string;
  role: AssignableRole;
}

export interface EmployeeCodeRotateResult {
  newEmployeeCode: string;
  rotatedAt: string;
  nextRotationAt: string;
}

export const employeeApi = {
  /** 같은 브랜드의 직원 계정 목록을 조회합니다. (본사 전용) */
  getList: async (): Promise<Employee[]> => {
    const res = await apiClient.get('/api/employees');
    return unwrap(res);
  },

  /** 신규 직원 계정을 발급합니다. (본사 전용) */
  create: async (data: EmployeeCreateRequest): Promise<Employee> => {
    const res = await apiClient.post('/api/employees', data);
    return unwrap(res);
  },

  /** 직원 이름·이메일·역할을 수정합니다. (본사 전용, ADMIN 제외) */
  update: async (id: number, data: EmployeeUpdateRequest): Promise<Employee> => {
    const res = await apiClient.put(`/api/employees/${id}`, data);
    return unwrap(res);
  },

  /** 직원 계정을 비활성화합니다. (본사 전용, ADMIN·본인 제외) */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/employees/${id}`);
  },

  /** 직원 비밀번호를 초기화합니다. (본사 전용) */
  resetPassword: async (id: number, newPassword: string): Promise<Employee> => {
    const res = await apiClient.put(`/api/employees/${id}/password`, { newPassword });
    return unwrap(res);
  },

  /** 직원 코드를 즉시 로테이션합니다. 새 코드와 다음 예정 시각을 반환합니다. (본사 전용) */
  rotateCode: async (id: number): Promise<EmployeeCodeRotateResult> => {
    const res = await apiClient.post(`/api/employees/${id}/rotate-code`);
    return unwrap(res);
  },

  /** 승인 대기 직원 목록을 조회합니다. (점장·관리자 전용) */
  getPending: async (): Promise<Employee[]> => {
    const res = await apiClient.get('/api/employees/pending');
    return unwrap(res);
  },

  /** 승인 대기 직원을 승인합니다. (점장·관리자 전용) */
  approve: async (employeeId: number): Promise<Employee> => {
    const res = await apiClient.post(`/api/employees/${employeeId}/approve`);
    return unwrap(res);
  },

  /** 승인 대기 직원을 거절합니다. (점장·관리자 전용) */
  reject: async (employeeId: number, reason: string): Promise<Employee> => {
    const res = await apiClient.post(`/api/employees/${employeeId}/reject`, { reason });
    return unwrap(res);
  },
};
