import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import { Store, storeApi } from '../storeApi';

const mock = new MockAdapter(apiClient);

afterEach(() => {
  mock.reset();
});

const fakeStore = (overrides?: Partial<Store>): Store => ({
  id: 1,
  brandId: 1,
  storeCode: '1001',
  storeName: '강남점',
  active: true,
  ...overrides,
});

describe('storeApi.getList()', () => {
  it('GET /api/stores 결과를 반환한다', async () => {
    const stores = [fakeStore()];
    mock.onGet('/api/stores').reply(200, { data: stores });

    const result = await storeApi.getList();

    expect(result).toEqual(stores);
  });
});

describe('storeApi.create()', () => {
  it('점별 코드와 매장명을 서버로 전송한다', async () => {
    const created = fakeStore({ id: 2, storeCode: '1002', storeName: '홍대점' });
    mock.onPost('/api/stores').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({ storeCode: '1002', storeName: '홍대점' });
      return [200, { data: created }];
    });

    const result = await storeApi.create({ storeCode: '1002', storeName: '홍대점' });

    expect(result).toEqual(created);
  });
});
