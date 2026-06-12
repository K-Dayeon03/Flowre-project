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
  it('점별 코드·매장명·주소를 서버로 전송한다', async () => {
    const created = fakeStore({
      id: 2,
      storeCode: '1002',
      storeName: '홍대점',
      postalCode: '04039',
      roadAddress: '서울 마포구 양화로 100',
    });
    mock.onPost('/api/stores').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({
        storeCode: '1002',
        storeName: '홍대점',
        postalCode: '04039',
        roadAddress: '서울 마포구 양화로 100',
        detailAddress: '3층',
      });
      return [200, { data: created }];
    });

    const result = await storeApi.create({
      storeCode: '1002',
      storeName: '홍대점',
      postalCode: '04039',
      roadAddress: '서울 마포구 양화로 100',
      detailAddress: '3층',
    });

    expect(result).toEqual(created);
  });
});

describe('storeApi.updateAddress()', () => {
  it('PATCH /api/stores/{id}/address 로 주소를 수정한다', async () => {
    const updated = fakeStore({ postalCode: '06035', roadAddress: '서울 강남구 가로수길 5' });
    mock.onPatch('/api/stores/1/address').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({
        postalCode: '06035',
        roadAddress: '서울 강남구 가로수길 5',
      });
      return [200, { data: updated }];
    });

    const result = await storeApi.updateAddress(1, {
      postalCode: '06035',
      roadAddress: '서울 강남구 가로수길 5',
    });

    expect(result).toEqual(updated);
  });
});
