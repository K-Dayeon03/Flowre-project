import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import { InventoryOrder, orderApi } from '../orderApi';

const mock = new MockAdapter(apiClient);

afterEach(() => {
  mock.reset();
});

const fakeOrder = (overrides?: Partial<InventoryOrder>): InventoryOrder => ({
  id: 1,
  storeId: 81542,
  storeName: 'FLOWRE',
  inventoryItemId: 10,
  productCode: 'J1-0-4-4-01-101',
  productName: '남녀공용 라이트 다운필 베스트',
  currentQuantity: 0,
  minQuantity: 5,
  orderQuantity: 5,
  unitPrice: 29900,
  expectedAmount: 149500,
  status: 'PREPARING',
  requestedById: 7,
  requestedByName: '매장 직원',
  createdAt: '2026-08-05T09:00:00',
  ...overrides,
});

describe('orderApi.getOrders()', () => {
  it('발주 목록 조회 파라미터를 전달한다', async () => {
    const orders = [fakeOrder()];
    mock.onGet('/api/orders', { params: { status: 'PREPARING', limit: 50 } }).reply(200, { data: orders });

    const result = await orderApi.getOrders({ status: 'PREPARING', limit: 50 });

    expect(result).toEqual(orders);
  });
});

describe('orderApi.create()', () => {
  it('재고 항목 기준으로 발주를 생성한다', async () => {
    const order = fakeOrder();
    mock.onPost('/api/orders').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({
        inventoryItemId: 10,
        orderQuantity: 5,
        unitPrice: 29900,
      });
      return [200, { data: order }];
    });

    const result = await orderApi.create({ inventoryItemId: 10, orderQuantity: 5, unitPrice: 29900 });

    expect(result).toEqual(order);
  });
});

describe('orderApi.changeStatus()', () => {
  it('발주 상태를 변경한다', async () => {
    const order = fakeOrder({ status: 'SHIPPING' });
    mock.onPatch('/api/orders/1/status').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({ status: 'SHIPPING' });
      return [200, { data: order }];
    });

    const result = await orderApi.changeStatus(1, 'SHIPPING');

    expect(result.status).toBe('SHIPPING');
  });
});

