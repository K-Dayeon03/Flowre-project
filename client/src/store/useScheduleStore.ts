import { create } from 'zustand';
import { scheduleApi, Schedule, ScheduleCreateRequest } from '../api/scheduleApi';

interface ScheduleState {
  schedules: Schedule[];
  loading: boolean;
  error: string | null;

  fetchSchedules: () => Promise<void>;
  createSchedule: (data: ScheduleCreateRequest) => Promise<void>;
  completeSchedule: (id: number) => Promise<void>;
  deleteSchedule: (id: number) => Promise<void>;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedules: [],
  loading: false,
  error: null,

  fetchSchedules: async () => {
    set({ loading: true, error: null });
    try {
      const schedules = await scheduleApi.getList();
      set({ schedules });
    } catch (e: any) {
      set({ error: e.message ?? '스케줄을 불러오지 못했습니다.' });
    } finally {
      set({ loading: false });
    }
  },

  createSchedule: async (data) => {
    set({ loading: true, error: null });
    try {
      const created = await scheduleApi.create(data);
      set((state) => ({ schedules: [created, ...state.schedules] }));
    } finally {
      set({ loading: false });
    }
  },

  completeSchedule: async (id) => {
    await scheduleApi.complete(id);
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === id ? { ...s, status: 'DONE' } : s
      ),
    }));
  },

  deleteSchedule: async (id) => {
    await scheduleApi.delete(id);
    set((state) => ({
      schedules: state.schedules.filter((s) => s.id !== id),
    }));
  },
}));
