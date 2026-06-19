import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import { AddressSearchResult, NearbyStore, Store, storeApi } from '../storeApi';

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

describe('storeApi.getNearbyStores()', () => {
  it('GET /api/stores/nearby 에 lat/lng/limit을 전달한다', async () => {
    const nearby: NearbyStore[] = [{ storeCode: '1001', storeName: '강남점', distanceMeters: 120 }];
    mock.onGet('/api/stores/nearby', { params: { lat: 37.5, lng: 127.0, limit: 5 } }).reply(200, { data: nearby });

    const result = await storeApi.getNearbyStores(37.5, 127.0);

    expect(result).toEqual(nearby);
  });
});

describe('storeApi.searchAddresses()', () => {
  it('GET /api/stores/addresses/search 에 검색어를 전달한다', async () => {
    const addresses: AddressSearchResult[] = [{
      postalCode: '06035',
      roadAddress: '서울 강남구 가로수길 5',
      jibunAddress: '서울 강남구 신사동 533',
      latitude: 37.5219,
      longitude: 127.0227,
    }];
    mock.onGet('/api/stores/addresses/search', { params: { query: '가로수길 5' } }).reply(200, { data: addresses });

    const result = await storeApi.searchAddresses('가로수길 5');

    expect(result).toEqual(addresses);
  });
});

describe('storeApi.create()', () => {
  it('매장명·주소를 서버로 전송하고 발급된 점별 코드를 반환받는다', async () => {
    const created = fakeStore({
      id: 2,
      storeCode: '1002',
      storeName: '홍대점',
      postalCode: '04039',
      roadAddress: '서울 마포구 양화로 100',
    });
    mock.onPost('/api/stores').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({
        storeName: '홍대점',
        postalCode: '04039',
        roadAddress: '서울 마포구 양화로 100',
        detailAddress: '3층',
        latitude: 37.5563,
        longitude: 126.922,
      });
      return [200, { data: created }];
    });

    const result = await storeApi.create({
      storeName: '홍대점',
      postalCode: '04039',
      roadAddress: '서울 마포구 양화로 100',
      detailAddress: '3층',
      latitude: 37.5563,
      longitude: 126.922,
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
