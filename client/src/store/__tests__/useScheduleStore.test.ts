import { scheduleApi, Schedule, ScheduleCreateRequest } from '../../api/scheduleApi';
import { useScheduleStore } from '../useScheduleStore';

// scheduleApi를 mock
jest.mock('../../api/scheduleApi', () => ({
  scheduleApi: {
    getList: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    complete: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApi = scheduleApi as jest.Mocked<typeof scheduleApi>;

// ── 테스트 헬퍼 ──────────────────────────────────────────────────
const fakeSchedule = (overrides?: Partial<Schedule>): Schedule => ({
  id: 1,
  title: '마네킹 교체',
  type: 'MANNEQUIN',
  status: 'PENDING',
  dueDate: '2026-03-20T00:00:00Z',
  assignee: '김민지',
  storeId: 10,
  description: '1층 마네킹',
  createdAt: '2026-03-17T09:00:00Z',
  createdBy: '이수진',
  ...overrides,
});

// 각 테스트 전 store & mock 초기화
beforeEach(() => {
  jest.clearAllMocks();
  useScheduleStore.setState({
    schedules: [],
    loading: false,
    error: null,
  });
});

// ── 초기 상태 ─────────────────────────────────────────────────────
describe('초기 상태', () => {
  it('{ schedules: [], loading: false, error: null }', () => {
    const state = useScheduleStore.getState();
    expect(state.schedules).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });
});

// ── fetchSchedules() ─────────────────────────────────────────────
describe('fetchSchedules()', () => {
  it('성공: loading 전환 + schedules 갱신', async () => {
    const list = [fakeSchedule({ id: 1 }), fakeSchedule({ id: 2, title: 'VM 점검' })];
    mockedApi.getList.mockResolvedValue(list);

    const promise = useScheduleStore.getState().fetchSchedules();

    // loading이 true로 전환되었는지 확인
    expect(useScheduleStore.getState().loading).toBe(true);
    expect(useScheduleStore.getState().error).toBeNull();

    await promise;

    const state = useScheduleStore.getState();
    expect(state.schedules).toEqual(list);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('실패: error 메시지 세팅 + loading false 복구', async () => {
    mockedApi.getList.mockRejectedValue(new Error('네트워크 오류'));

    await useScheduleStore.getState().fetchSchedules();

    const state = useScheduleStore.getState();
    expect(state.error).toBe('네트워크 오류');
    expect(state.loading).toBe(false);
    expect(state.schedules).toEqual([]);
  });

  it('실패: message 없는 에러 → 기본 메시지', async () => {
    mockedApi.getList.mockRejectedValue({});

    await useScheduleStore.getState().fetchSchedules();

    const state = useScheduleStore.getState();
    expect(state.error).toBe('스케줄을 불러오지 못했습니다.');
  });
});

// ── createSchedule() ─────────────────────────────────────────────
describe('createSchedule()', () => {
  it('성공: 새 스케줄이 배열 맨 앞에 추가 ([created, ...prev])', async () => {
    const existing = fakeSchedule({ id: 1 });
    useScheduleStore.setState({ schedules: [existing] });

    const created = fakeSchedule({ id: 99, title: '새 스케줄' });
    mockedApi.create.mockResolvedValue(created);

    const reqData: ScheduleCreateRequest = {
      title: '새 스케줄',
      type: 'OTHER',
      dueDate: '2026-04-01T00:00:00Z',
    };

    await useScheduleStore.getState().createSchedule(reqData);

    const state = useScheduleStore.getState();
    expect(state.schedules).toHaveLength(2);
    // 새 스케줄이 맨 앞에 위치
    expect(state.schedules[0]).toEqual(created);
    expect(state.schedules[1]).toEqual(existing);
    expect(state.loading).toBe(false);
  });

  it('성공: loading 전환 확인', async () => {
    mockedApi.create.mockResolvedValue(fakeSchedule({ id: 2 }));

    const promise = useScheduleStore.getState().createSchedule({
      title: '테스트',
      type: 'MANNEQUIN',
      dueDate: '2026-04-01T00:00:00Z',
    });

    expect(useScheduleStore.getState().loading).toBe(true);

    await promise;

    expect(useScheduleStore.getState().loading).toBe(false);
  });
});

// ── completeSchedule() ───────────────────────────────────────────
describe('completeSchedule()', () => {
  it('해당 id의 status가 DONE으로 변경', async () => {
    const s1 = fakeSchedule({ id: 1, status: 'PENDING' });
    const s2 = fakeSchedule({ id: 2, status: 'IN_PROGRESS' });
    useScheduleStore.setState({ schedules: [s1, s2] });

    mockedApi.complete.mockResolvedValue(undefined);

    await useScheduleStore.getState().completeSchedule(1);

    const state = useScheduleStore.getState();
    expect(state.schedules[0].status).toBe('DONE');
    // 나머지 스케줄은 변경 없음 (불변성 확인)
    expect(state.schedules[1].status).toBe('IN_PROGRESS');
    expect(state.schedules[1]).toEqual(s2);
  });

  it('API 호출이 1회만 발생', async () => {
    useScheduleStore.setState({ schedules: [fakeSchedule({ id: 5, status: 'PENDING' })] });
    mockedApi.complete.mockResolvedValue(undefined);

    await useScheduleStore.getState().completeSchedule(5);

    expect(mockedApi.complete).toHaveBeenCalledTimes(1);
    expect(mockedApi.complete).toHaveBeenCalledWith(5);
  });

  it('존재하지 않는 id → 배열 변화 없음', async () => {
    const s1 = fakeSchedule({ id: 1, status: 'PENDING' });
    useScheduleStore.setState({ schedules: [s1] });

    mockedApi.complete.mockResolvedValue(undefined);

    await useScheduleStore.getState().completeSchedule(999);

    const state = useScheduleStore.getState();
    expect(state.schedules).toHaveLength(1);
    expect(state.schedules[0].status).toBe('PENDING');
  });
});

// ── deleteSchedule() ─────────────────────────────────────────────
describe('deleteSchedule()', () => {
  it('해당 id 스케줄이 배열에서 제거', async () => {
    const s1 = fakeSchedule({ id: 1 });
    const s2 = fakeSchedule({ id: 2, title: 'VM 점검' });
    useScheduleStore.setState({ schedules: [s1, s2] });

    mockedApi.delete.mockResolvedValue(undefined);

    await useScheduleStore.getState().deleteSchedule(1);

    const state = useScheduleStore.getState();
    expect(state.schedules).toHaveLength(1);
    expect(state.schedules[0].id).toBe(2);
  });

  it('다른 스케줄은 유지', async () => {
    const s1 = fakeSchedule({ id: 1 });
    const s2 = fakeSchedule({ id: 2 });
    const s3 = fakeSchedule({ id: 3 });
    useScheduleStore.setState({ schedules: [s1, s2, s3] });

    mockedApi.delete.mockResolvedValue(undefined);

    await useScheduleStore.getState().deleteSchedule(2);

    const state = useScheduleStore.getState();
    expect(state.schedules).toHaveLength(2);
    expect(state.schedules.map((s) => s.id)).toEqual([1, 3]);
  });
});
