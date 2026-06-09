import { inventoryApi, InventoryItem } from '../../api/inventoryApi';
import { useInventoryStore } from '../useInventoryStore';

jest.mock('../../api/inventoryApi', () => ({
  inventoryApi: {
    search: jest.fn(),
    getLabels: jest.fn(),
    createLabel: jest.fn(),
    archive: jest.fn(),
    unarchive: jest.fn(),
    deduct: jest.fn(),
    getTransactions: jest.fn(),
    reload: jest.fn(),
  },
}));

const mockedApi = inventoryApi as jest.Mocked<typeof inventoryApi>;

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
  quantity: 12,
  archived: false,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  useInventoryStore.setState({
    items: [],
    labels: [{ id: 1, name: '추후 필요 재고' }],
    loading: false,
    error: null,
  });
});

describe('fetchItems()', () => {
  it('검색 결과로 items를 갱신한다', async () => {
    const list = [fakeInventory()];
    mockedApi.search.mockResolvedValue(list);

    await useInventoryStore.getState().fetchItems({ query: '다운필', archived: false });

    expect(mockedApi.search).toHaveBeenCalledWith({ query: '다운필', archived: false });
    expect(useInventoryStore.getState().items).toEqual(list);
  });
});

describe('archiveItem()', () => {
  it('아카이브한 항목을 현재 목록에서 제거한다', async () => {
    const item = fakeInventory();
    const payload = {
      labelName: '추후 필요 재고',
      archiveItemName: item.productName,
      archiveQuantity: item.quantity,
    };
    const archived = fakeInventory({
      archived: true,
      archiveLabelName: '추후 필요 재고',
      archiveItemName: item.productName,
      archiveQuantity: item.quantity,
    });
    useInventoryStore.setState({ items: [item] });
    mockedApi.archive.mockResolvedValue(archived);

    await useInventoryStore.getState().archiveItem(1, payload);

    expect(mockedApi.archive).toHaveBeenCalledWith(1, payload);
    expect(useInventoryStore.getState().items).toEqual([]);
  });
});

describe('deductItem()', () => {
  it('서버가 반환한 version과 quantity로 항목을 교체한다', async () => {
    const item = fakeInventory();
    const updated = fakeInventory({ quantity: 9, version: 1 });
    useInventoryStore.setState({ items: [item] });
    mockedApi.deduct.mockResolvedValue(updated);

    await useInventoryStore.getState().deductItem(item, 3, '본사 사용');

    expect(mockedApi.deduct).toHaveBeenCalledWith(1, {
      quantity: 3,
      version: 0,
      reason: '본사 사용',
    });
    expect(useInventoryStore.getState().items[0]).toEqual(updated);
  });
});
