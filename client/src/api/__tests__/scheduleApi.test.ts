import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import { scheduleApi, Schedule, ScheduleCreateRequest } from '../scheduleApi';

const mock = new MockAdapter(apiClient);

afterEach(() => {
  mock.reset();
});

// ── 테스트 헬퍼 ──────────────────────────────────────────────────
const fakeSchedule = (overrides?: Partial<Schedule>): Schedule => ({
  id: 1,
  title: '마네킹 교체',
  type: 'MANNEQUIN',
  status: 'PENDING',
  dueDate: '2026-03-20T00:00:00Z',
  assignee: '김민지',
  storeId: 10,
  description: '1층 입구 마네킹 교체',
  createdAt: '2026-03-17T09:00:00Z',
  createdBy: '이수진',
  ...overrides,
});

// ── getList() ─────────────────────────────────────────────────────
describe('scheduleApi.getList()', () => {
  it('GET /api/schedules 호출 → Schedule[] 반환', async () => {
    const list = [fakeSchedule(), fakeSchedule({ id: 2, title: 'VM 점검' })];
    mock.onGet('/api/schedules').reply(200, { data: list });

    const result = await scheduleApi.getList();
    expect(result).toEqual(list);
    expect(result).toHaveLength(2);
  });

  it('status=PENDING 쿼리 파라미터 포함', async () => {
    mock.onGet('/api/schedules', { params: { status: 'PENDING' } }).reply(200, { data: [fakeSchedule()] });

    const result = await scheduleApi.getList({ status: 'PENDING' });
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('PENDING');
  });

  it('storeId=1 필터 포함', async () => {
    const schedule = fakeSchedule({ storeId: 1 });
    mock.onGet('/api/schedules', { params: { storeId: 1 } }).reply(200, { data: [schedule] });

    const result = await scheduleApi.getList({ storeId: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].storeId).toBe(1);
  });
});

// ── getById() ────────────────────────────────────────────────────
describe('scheduleApi.getById()', () => {
  it('GET /api/schedules/1 경로 확인', async () => {
    const schedule = fakeSchedule({ id: 1 });
    mock.onGet('/api/schedules/1').reply(200, { data: schedule });

    const result = await scheduleApi.getById(1);
    expect(result).toEqual(schedule);
    expect(result.id).toBe(1);
  });
});

// ── create() ─────────────────────────────────────────────────────
describe('scheduleApi.create()', () => {
  it('POST /api/schedules body 검증 + 생성된 Schedule 반환', async () => {
    const reqBody: ScheduleCreateRequest = {
      title: '본사 방문',
      type: 'HQ_VISIT',
      dueDate: '2026-04-01T00:00:00Z',
      assignee: '박지민',
      description: '분기 점검',
    };
    const created = fakeSchedule({ id: 99, title: '본사 방문', type: 'HQ_VISIT' });

    mock.onPost('/api/schedules').reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.title).toBe('본사 방문');
      expect(body.type).toBe('HQ_VISIT');
      expect(body.dueDate).toBe('2026-04-01T00:00:00Z');
      return [201, { data: created }];
    });

    const result = await scheduleApi.create(reqBody);
    expect(result).toEqual(created);
  });

  it('description 없이 생성 가능 (optional 필드)', async () => {
    const reqBody: ScheduleCreateRequest = {
      title: 'VM 체크',
      type: 'VM_CHECK',
      dueDate: '2026-04-05T00:00:00Z',
    };
    const created = fakeSchedule({ id: 100, title: 'VM 체크', type: 'VM_CHECK', description: undefined });

    mock.onPost('/api/schedules').reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.description).toBeUndefined();
      expect(body.assignee).toBeUndefined();
      return [201, { data: created }];
    });

    const result = await scheduleApi.create(reqBody);
    expect(result.title).toBe('VM 체크');
  });
});

// ── update() ─────────────────────────────────────────────────────
describe('scheduleApi.update()', () => {
  it('PUT /api/schedules/1, Partial 필드만 전송', async () => {
    const updated = fakeSchedule({ id: 1, title: '변경' });

    mock.onPut('/api/schedules/1').reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.title).toBe('변경');
      // Partial이므로 다른 필드는 없을 수 있음
      return [200, { data: updated }];
    });

    const result = await scheduleApi.update(1, { title: '변경' });
    expect(result.title).toBe('변경');
  });
});

// ── complete() ───────────────────────────────────────────────────
describe('scheduleApi.complete()', () => {
  it('PATCH /api/schedules/1/complete 호출', async () => {
    mock.onPatch('/api/schedules/1/complete').reply(200);

    await expect(scheduleApi.complete(1)).resolves.toBeUndefined();
  });

  it('서버 에러 시 에러 propagation', async () => {
    mock.onPatch('/api/schedules/1/complete').reply(500, { message: 'Internal Server Error' });

    await expect(scheduleApi.complete(1)).rejects.toThrow();
  });
});

// ── delete() ─────────────────────────────────────────────────────
describe('scheduleApi.delete()', () => {
  it('DELETE /api/schedules/1 호출', async () => {
    mock.onDelete('/api/schedules/1').reply(200);

    await expect(scheduleApi.delete(1)).resolves.toBeUndefined();
  });
});
