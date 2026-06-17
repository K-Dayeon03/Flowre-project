import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import { employeeApi } from '../employeeApi';

const mock = new MockAdapter(apiClient);

afterEach(() => {
  mock.reset();
});

// ── employeeApi.getList() ─────────────────────────────────────────
describe('employeeApi.getList()', () => {
  it('GET /api/employees → 직원 목록 반환', async () => {
    const mockResponse = {
      data: [
        {
          id: 1,
          name: '김직원',
          email: 'staff@flowre.local',
          employeeCode: '1001WXYZ!',
          role: 'STORE_STAFF',
          brandId: 1,
          storeId: 10,
          storeCode: '1001',
          storeName: '강남점',
        },
      ],
    };
    mock.onGet('/api/employees').reply(200, mockResponse);

    const result = await employeeApi.getList();
    expect(result).toHaveLength(1);
    expect(result[0].employeeCode).toBe('1001WXYZ!');
  });
});

// ── employeeApi.create() ──────────────────────────────────────────
describe('employeeApi.create()', () => {
  it('POST /api/employees → 발급된 직원 계정 반환', async () => {
    const created = {
      id: 2,
      name: '박직원',
      email: 'new@flowre.local',
      employeeCode: '1001ABCD!',
      role: 'STORE_MANAGER',
      brandId: 1,
      storeId: 10,
      storeCode: '1001',
      storeName: '강남점',
    };
    mock.onPost('/api/employees').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({
        name: '박직원',
        email: 'new@flowre.local',
        storeCode: '1001',
        employeeCode: '1001ABCD!',
        password: 'Password1!',
        role: 'STORE_MANAGER',
      });
      return [200, { data: created }];
    });

    const result = await employeeApi.create({
      name: '박직원',
      email: 'new@flowre.local',
      storeCode: '1001',
      employeeCode: '1001ABCD!',
      password: 'Password1!',
      role: 'STORE_MANAGER',
    });
    expect(result.id).toBe(2);
    expect(result.employeeCode).toBe('1001ABCD!');
  });

  it('중복 직원 아이디(409) → 에러 throw', async () => {
    mock.onPost('/api/employees').reply(409, {
      error: { code: 'USER_002', message: '이미 등록된 직원 아이디입니다.' },
    });

    await expect(
      employeeApi.create({
        name: '박직원',
        email: 'new@flowre.local',
        storeCode: '1001',
        employeeCode: '1001ABCD!',
        password: 'Password1!',
        role: 'STORE_STAFF',
      })
    ).rejects.toThrow();
  });
});

// ── employeeApi 승인 플로우 ───────────────────────────────────────
describe('employeeApi 승인 플로우', () => {
  it('GET /api/employees/pending → 승인 대기 목록 반환', async () => {
    mock.onGet('/api/employees/pending').reply(200, {
      data: [
        {
          id: 3,
          name: '이대기',
          email: 'pending@flowre.local',
          employeeCode: '1001PEND!',
          role: 'STORE_STAFF',
          status: 'PENDING',
          brandId: 1,
          storeId: 10,
          storeCode: '1001',
          storeName: '강남점',
        },
      ],
    });

    const result = await employeeApi.getPending();
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('PENDING');
  });

  it('POST /api/employees/{id}/approve → 승인된 직원 반환', async () => {
    mock.onPost('/api/employees/3/approve').reply(200, {
      data: { id: 3, employeeCode: '1001PEND!', status: 'ACTIVE' },
    });

    const result = await employeeApi.approve(3);
    expect(result.status).toBe('ACTIVE');
  });

  it('POST /api/employees/{id}/reject → 사유와 함께 거절', async () => {
    mock.onPost('/api/employees/3/reject').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({ reason: '매장 소속이 아님' });
      return [200, { data: { id: 3, status: 'REJECTED', rejectReason: '매장 소속이 아님' } }];
    });

    const result = await employeeApi.reject(3, '매장 소속이 아님');
    expect(result.status).toBe('REJECTED');
  });
});
