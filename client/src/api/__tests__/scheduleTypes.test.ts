import type { ScheduleType, ScheduleStatus, ScheduleCreateRequest, Schedule } from '../scheduleApi';

// ISO 8601 datetime 정규식 (YYYY-MM-DDTHH:mm:ssZ 또는 ±HH:MM offset)
const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

// ── ScheduleType enum 값 전체 커버 ───────────────────────────────
describe('ScheduleType', () => {
  const validTypes: ScheduleType[] = ['MANNEQUIN', 'HQ_VISIT', 'VM_CHECK', 'OTHER'];

  it.each(validTypes)('"%s" 는 유효한 ScheduleType이다', (type) => {
    // 타입 수준 검증: 컴파일 타임에 통과하면 런타임도 OK
    const t: ScheduleType = type;
    expect(validTypes).toContain(t);
  });

  it('4개의 타입이 존재한다', () => {
    expect(validTypes).toHaveLength(4);
  });
});

// ── ScheduleStatus enum 값 전체 커버 ─────────────────────────────
describe('ScheduleStatus', () => {
  const validStatuses: ScheduleStatus[] = ['PENDING', 'IN_PROGRESS', 'DONE'];

  it.each(validStatuses)('"%s" 는 유효한 ScheduleStatus이다', (status) => {
    const s: ScheduleStatus = status;
    expect(validStatuses).toContain(s);
  });

  it('3개의 상태가 존재한다', () => {
    expect(validStatuses).toHaveLength(3);
  });
});

// ── ScheduleCreateRequest: optional 필드 검증 ────────────────────
describe('ScheduleCreateRequest', () => {
  it('assignee, description 없이 생성 가능', () => {
    const req: ScheduleCreateRequest = {
      title: '마네킹 교체',
      type: 'MANNEQUIN',
      dueDate: '2026-04-01T00:00:00Z',
    };
    // 필수 필드만 있어도 타입 에러 없이 생성됨
    expect(req.title).toBe('마네킹 교체');
    expect(req.assignee).toBeUndefined();
    expect(req.description).toBeUndefined();
  });

  it('assignee, description 포함 가능', () => {
    const req: ScheduleCreateRequest = {
      title: 'VM 점검',
      type: 'VM_CHECK',
      dueDate: '2026-04-05T10:00:00Z',
      assignee: '박지민',
      description: '전 매장 VM 상태 확인',
    };
    expect(req.assignee).toBe('박지민');
    expect(req.description).toBe('전 매장 VM 상태 확인');
  });
});

// ── Schedule.dueDate: ISO 8601 문자열 형식 유효성 ─────────────────
describe('Schedule.dueDate ISO 8601 유효성', () => {
  const validDates = [
    '2026-03-20T00:00:00Z',
    '2026-12-31T23:59:59Z',
    '2026-01-01T09:30:00+09:00',
    '2026-06-15T14:00:00.000Z',
  ];

  it.each(validDates)('"%s" 는 유효한 ISO 8601 형식이다', (dateStr) => {
    const schedule: Partial<Schedule> = { dueDate: dateStr };
    expect(schedule.dueDate).toMatch(ISO_8601_REGEX);
  });

  const invalidDates = ['2026-03-20', '20260320', 'not-a-date', '2026/03/20 00:00:00'];

  it.each(invalidDates)('"%s" 는 유효하지 않은 ISO 8601 형식이다', (dateStr) => {
    expect(dateStr).not.toMatch(ISO_8601_REGEX);
  });
});
