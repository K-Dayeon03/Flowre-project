import { inventoryApi, InventoryItem, InventoryPage } from '../../api/inventoryApi';
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
    uploadDaily: jest.fn(),
    getCategoryCounts: jest.fn(),
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

const fakePage = (items: InventoryItem[]): InventoryPage => ({
  items,
  totalCount: items.length,
  totalPages: 1,
  hasNext: false,
});

beforeEach(() => {
  jest.clearAllMocks();
  useInventoryStore.setState({
    items: [],
    labels: [{ id: 1, name: '추후 필요 재고' }],
    categoryCounts: [],
    loading: false,
    loadingMore: false,
    error: null,
    totalCount: 0,
    hasNext: false,
    currentPage: 0,
    lastParams: {},
  });
});

describe('fetchItems()', () => {
  it('검색 결과로 items를 갱신한다', async () => {
    const list = [fakeInventory()];
    mockedApi.search.mockResolvedValue(fakePage(list));

    await useInventoryStore.getState().fetchItems({ query: '다운필', archived: false });

    expect(mockedApi.search).toHaveBeenCalledWith({ query: '다운필', archived: false, page: 0 });
    expect(useInventoryStore.getState().items).toEqual(list);
  });

  it('카테고리 필터를 그대로 API에 전달한다', async () => {
    mockedApi.search.mockResolvedValue(fakePage([]));

    await useInventoryStore.getState().fetchItems({ archived: false, category: 'OUTER' });

    expect(mockedApi.search).toHaveBeenCalledWith({ archived: false, category: 'OUTER', page: 0 });
  });
});

describe('fetchCategoryCounts()', () => {
  it('카테고리별 건수를 조회해 categoryCounts를 갱신한다', async () => {
    const counts = [
      { category: 'OUTER', label: '아우터', count: 120 },
      { category: 'JACKET', label: '자켓', count: 34 },
    ];
    mockedApi.getCategoryCounts.mockResolvedValue(counts);

    await useInventoryStore.getState().fetchCategoryCounts({ archived: false });

    expect(mockedApi.getCategoryCounts).toHaveBeenCalledWith({ archived: false });
    expect(useInventoryStore.getState().categoryCounts).toEqual(counts);
  });
});

describe('archiveItem()', () => {
  it('보관 후 서버가 반환한 차감된 원본으로 목록 항목을 교체하고 라벨을 갱신한다', async () => {
    const item = fakeInventory({ quantity: 12 });
    const payload = {
      labelName: '추후 필요 재고',
      archiveItemName: item.productName,
      archiveItemCode: item.productCode,
      archiveQuantity: 5,
    };
    // 서버는 수량이 차감된 원본(실시간 재고) 항목을 반환한다.
    const updatedSource = fakeInventory({ quantity: 7, version: 1 });
    useInventoryStore.setState({ items: [item] });
    mockedApi.archive.mockResolvedValue(updatedSource);
    mockedApi.getLabels.mockResolvedValue([{ id: 1, name: '추후 필요 재고' }]);

    await useInventoryStore.getState().archiveItem(1, payload);

    expect(mockedApi.archive).toHaveBeenCalledWith(1, payload);
    expect(useInventoryStore.getState().items[0]).toEqual(updatedSource);
    expect(mockedApi.getLabels).toHaveBeenCalled();
  });
});

describe('uploadDailyFile()', () => {
  it('파일을 업로드하고 목록·라벨을 새로고침한 뒤 반영 통계를 반환한다', async () => {
    const file = { uri: 'file:///tmp/daily.xlsx', name: 'daily.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    const loadResult = {
      fileCount: 1,
      rowCount: 10,
      createdCount: 3,
      updatedCount: 5,
      skippedCount: 0,
      zeroedCount: 2,
      fileNames: ['daily.xlsx'],
    };
    const refreshed = [fakeInventory()];
    mockedApi.uploadDaily.mockResolvedValue(loadResult);
    mockedApi.search.mockResolvedValue(fakePage(refreshed));
    mockedApi.getLabels.mockResolvedValue([{ id: 1, name: '추후 필요 재고' }]);

    const result = await useInventoryStore.getState().uploadDailyFile(file);

    expect(mockedApi.uploadDaily).toHaveBeenCalledWith(file);
    expect(mockedApi.search).toHaveBeenCalledWith({ archived: false, page: 0 });
    expect(mockedApi.getLabels).toHaveBeenCalled();
    expect(result).toEqual(loadResult);
    expect(useInventoryStore.getState().items).toEqual(refreshed);
    expect(useInventoryStore.getState().loading).toBe(false);
  });

  it('업로드 실패 시 에러를 저장하고 예외를 다시 던진다', async () => {
    const file = { uri: 'file:///tmp/daily.xlsx', name: 'daily.xlsx', type: 'application/octet-stream' };
    mockedApi.uploadDaily.mockRejectedValue(new Error('업로드 실패'));

    await expect(useInventoryStore.getState().uploadDailyFile(file)).rejects.toThrow('업로드 실패');
    expect(useInventoryStore.getState().error).toBe('업로드 실패');
    expect(useInventoryStore.getState().loading).toBe(false);
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
