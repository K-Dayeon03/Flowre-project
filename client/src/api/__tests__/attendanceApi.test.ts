import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import { attendanceApi, AttendanceRecord } from '../attendanceApi';

const mock = new MockAdapter(apiClient);

afterEach(() => {
  mock.reset();
});

const record = (overrides?: Partial<AttendanceRecord>): AttendanceRecord => ({
  id: 1,
  storeId: 1001,
  storeName: '강남점',
  userId: 10,
  userName: '사용자',
  workDate: '2026-08-05',
  clockInAt: '2026-08-05T09:00:00',
  clockOutAt: null,
  status: 'WORKING',
  totalMinutes: 0,
  ...overrides,
});

describe('attendanceApi.clockIn()', () => {
  it('출근 처리 API를 호출한다', async () => {
    mock.onPost('/api/attendance/clock-in').reply(200, { data: record() });

    const result = await attendanceApi.clockIn();

    expect(result.status).toBe('WORKING');
  });
});

describe('attendanceApi.clockOut()', () => {
  it('퇴근 처리 API를 호출한다', async () => {
    mock.onPost('/api/attendance/clock-out').reply(200, {
      data: record({ clockOutAt: '2026-08-05T18:00:00', status: 'OFF', totalMinutes: 540 }),
    });

    const result = await attendanceApi.clockOut();

    expect(result.status).toBe('OFF');
    expect(result.totalMinutes).toBe(540);
  });
});

describe('attendanceApi.getRecords()', () => {
  it('날짜별 근태 목록을 조회한다', async () => {
    const records = [record()];
    mock.onGet('/api/attendance', { params: { date: '2026-08-05', limit: 100 } }).reply(200, { data: records });

    const result = await attendanceApi.getRecords({ date: '2026-08-05', limit: 100 });

    expect(result).toEqual(records);
  });
});

