import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import { inventoryApi, InventoryItem } from '../inventoryApi';

const mock = new MockAdapter(apiClient);

afterEach(() => {
  mock.reset();
});

const fakeInventory = (overrides?: Partial<InventoryItem>): InventoryItem => ({
  id: 1,
  version: 0,
  storeId: 1,
  storeCode: '81542',
  storeName: 'FLOWRE',
  productCode: 'J1-0-4-4-01-101',
  colorCode: '48',
  colorName: 'KHAKI',
  sizeName: 'L',
  productName: '남녀공용 라이트 다운필 베스트',
  barcode: '8806077980199',
  sourceCode: '--',
  packQuantity: 1,
  normalPrice: 49900,
  retailPrice: 29900,
  quantity: 12,
  archived: false,
  ...overrides,
});

describe('inventoryApi.search()', () => {
  it('GET /api/inventories 호출과 검색 파라미터를 전달한다', async () => {
    const list = [fakeInventory()];
    mock.onGet('/api/inventories', {
      params: { query: '다운필', archived: false },
    }).reply(200, { data: list });

    const result = await inventoryApi.search({ query: '다운필', archived: false });

    expect(result).toEqual(list);
  });
});

describe('inventoryApi.archive()', () => {
  it('라벨 이름으로 재고를 아카이브한다', async () => {
    const archivePayload = {
      labelName: '추후 필요 재고',
      archiveItemName: '남녀공용 라이트 다운필 베스트',
      archiveItemCode: 'J1-0-4-4-01-101',
      archiveQuantity: 5,
    };
    // 서버는 수량이 차감된 원본(실시간 재고) 항목을 반환한다.
    const updatedSource = fakeInventory({ quantity: 7, version: 1 });
    mock.onPatch('/api/inventories/1/archive').reply((config) => {
      expect(JSON.parse(config.data)).toEqual(archivePayload);
      return [200, { data: updatedSource }];
    });

    const result = await inventoryApi.archive(1, archivePayload);

    expect(result.quantity).toBe(7);
    expect(result.version).toBe(1);
  });
});

describe('inventoryApi.deduct()', () => {
  it('수량과 version을 함께 보내 본사 차감을 요청한다', async () => {
    const updated = fakeInventory({ quantity: 10, version: 1 });
    mock.onPost('/api/inventories/1/deduct').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({
        quantity: 2,
        version: 0,
        reason: '본사 사용',
      });
      return [200, { data: updated }];
    });

    const result = await inventoryApi.deduct(1, { quantity: 2, version: 0, reason: '본사 사용' });

    expect(result.quantity).toBe(10);
    expect(result.version).toBe(1);
  });
});

describe('inventoryApi.reload()', () => {
  it('POST /api/inventories/reload 호출 결과를 반환한다', async () => {
    const response = {
      fileCount: 1,
      rowCount: 14744,
      createdCount: 14744,
      updatedCount: 0,
      skippedCount: 1,
      fileNames: ['FLOWRE_점별재고현황.xlsx'],
    };
    mock.onPost('/api/inventories/reload').reply(200, { data: response });

    const result = await inventoryApi.reload();

    expect(result).toEqual(response);
  });
});
