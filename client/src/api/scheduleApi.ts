import { apiClient, unwrap } from './client';

export type ScheduleType = 'MANNEQUIN' | 'HQ_VISIT' | 'VM_CHECK' | 'OTHER';
export type ScheduleStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';

export interface Schedule {
  id: number;
  title: string;
  type: ScheduleType;
  status: ScheduleStatus;
  dueDate: string;
  assignee: string;
  storeId: number;
  description?: string;
  createdAt: string;
  createdBy: string;
}

export interface ScheduleCreateRequest {
  title: string;
  type: ScheduleType;
  dueDate: string;
  assignee?: string;
  description?: string;
}

export const scheduleApi = {
  getList: async (params?: { status?: ScheduleStatus; storeId?: number }): Promise<Schedule[]> => {
    const res = await apiClient.get('/api/schedules', { params });
    return unwrap(res);
  },

  getById: async (id: number): Promise<Schedule> => {
    const res = await apiClient.get(`/api/schedules/${id}`);
    return unwrap(res);
  },

  create: async (data: ScheduleCreateRequest): Promise<Schedule> => {
    const res = await apiClient.post('/api/schedules', data);
    return unwrap(res);
  },

  update: async (id: number, data: Partial<ScheduleCreateRequest>): Promise<Schedule> => {
    const res = await apiClient.put(`/api/schedules/${id}`, data);
    return unwrap(res);
  },

  complete: async (id: number): Promise<void> => {
    await apiClient.patch(`/api/schedules/${id}/complete`);
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/schedules/${id}`);
  },
};
