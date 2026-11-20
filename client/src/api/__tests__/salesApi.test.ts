import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import { salesApi } from '../salesApi';

const mock = new MockAdapter(apiClient);

afterEach(() => {
  mock.reset();
});

describe('salesApi.getSummary()', () => {
  it('매출 요약을 조회한다', async () => {
    const summary = {
      today: { totalRevenue: 10000, totalOrders: 2, averageOrderValue: 5000, comparedToPrevious: 10 },
      week: { totalRevenue: 30000, totalOrders: 6, averageOrderValue: 5000, comparedToPrevious: null },
      month: { totalRevenue: 90000, totalOrders: 18, averageOrderValue: 5000, comparedToPrevious: -5 },
    };
    mock.onGet('/api/sales/summary').reply(200, { data: summary });

    const result = await salesApi.getSummary();

    expect(result).toEqual(summary);
  });
});

describe('salesApi.getHourly()', () => {
  it('시간대별 매출을 조회한다', async () => {
    const hourly = [{ hour: 10, totalRevenue: 10000, totalOrders: 2 }];
    mock.onGet('/api/sales/hourly', { params: { date: '2026-08-05' } }).reply(200, { data: hourly });

    const result = await salesApi.getHourly({ date: '2026-08-05' });

    expect(result).toEqual(hourly);
  });
});

describe('salesApi.getStores()', () => {
  it('매장별 매출 비교를 조회한다', async () => {
    const stores = [{ storeId: 1, storeName: '강남점', totalRevenue: 20000, totalOrders: 4, comparedToPrevious: 20 }];
    mock.onGet('/api/sales/stores').reply(200, { data: stores });

    const result = await salesApi.getStores();

    expect(result).toEqual(stores);
  });
});

