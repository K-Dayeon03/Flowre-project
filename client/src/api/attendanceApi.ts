import { apiClient, unwrap } from './client';

export type AttendanceStatus = 'WORKING' | 'OFF' | 'ON_LEAVE';

export interface AttendanceRecord {
  id: number;
  storeId: number;
  storeName: string;
  userId: number;
  userName: string;
  workDate: string;
  clockInAt?: string | null;
  clockOutAt?: string | null;
  status: AttendanceStatus;
  totalMinutes: number;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const attendanceApi = {
  clockIn: async (): Promise<AttendanceRecord> => {
    const res = await apiClient.post('/api/attendance/clock-in');
    return unwrap(res);
  },

  clockOut: async (): Promise<AttendanceRecord> => {
    const res = await apiClient.post('/api/attendance/clock-out');
    return unwrap(res);
  },

  getMyRecords: async (params?: { limit?: number }): Promise<AttendanceRecord[]> => {
    const res = await apiClient.get('/api/attendance/me', { params });
    return unwrap(res);
  },

  getRecords: async (params?: { storeId?: number; date?: string; limit?: number }): Promise<AttendanceRecord[]> => {
    const res = await apiClient.get('/api/attendance', { params });
    return unwrap(res);
  },
};

