import { apiClient, unwrap } from './client';
import { UserRole } from '../store/useAuthStore';

/** 본사가 발급 가능한 직원 권한 (ADMIN 제외) */
export type AssignableRole = Exclude<UserRole, 'ADMIN'>;

export interface Employee {
  id: number;
  name: string;
  email: string;
  employeeCode: string;
  role: UserRole;
  brandId: number;
  storeId: number;
  storeCode: string;
  storeName: string;
}

export interface EmployeeCreateRequest {
  name: string;
  email: string;
  storeCode: string;
  employeeCode: string;
  password: string;
  role: AssignableRole;
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
};
