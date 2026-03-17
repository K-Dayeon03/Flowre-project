import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import { documentApi, Document } from '../documentApi';

const mock = new MockAdapter(apiClient);

afterEach(() => {
  mock.reset();
});

// ── 테스트 헬퍼 ──────────────────────────────────────────────────
const fakeDocument = (overrides?: Partial<Document>): Document => ({
  id: 1,
  title: '매장 운영 매뉴얼',
  category: 'MANUAL',
  fileType: 'pdf',
  size: '2.4 MB',
  s3Url: 'https://s3.amazonaws.com/flowre/documents/manual-001.pdf',
  uploader: '김민지',
  brandId: 10,
  description: '2026년 1분기 매장 운영 매뉴얼',
  createdAt: '2026-03-17T09:00:00Z',
  ...overrides,
});

// ── brandId 격리 검증 ────────────────────────────────────────────
describe('Document brandId 격리 검증', () => {
  it('getList() 응답의 모든 문서에 brandId가 존재 (undefined 방지)', async () => {
    const docs = [
      fakeDocument({ id: 1, brandId: 10 }),
      fakeDocument({ id: 2, brandId: 10 }),
      fakeDocument({ id: 3, brandId: 10 }),
    ];
    mock.onGet('/api/documents').reply(200, { data: docs });

    const result = await documentApi.getList();

    result.forEach((doc) => {
      expect(doc.brandId).toBeDefined();
      expect(typeof doc.brandId).toBe('number');
      expect(doc.brandId).toBeGreaterThan(0);
    });
  });

  it('getById() 응답에 brandId가 존재', async () => {
    const doc = fakeDocument({ id: 1, brandId: 10 });
    mock.onGet('/api/documents/1').reply(200, { data: doc });

    const result = await documentApi.getById(1);
    expect(result.brandId).toBeDefined();
    expect(result.brandId).toBe(10);
  });

  it('create() 응답에 서버가 할당한 brandId가 존재', async () => {
    const created = fakeDocument({ id: 50, brandId: 10 });
    mock.onPost('/api/documents').reply(201, { data: created });

    const result = await documentApi.create({
      title: '테스트',
      category: 'MANUAL',
      s3Key: 'documents/test.pdf',
    });
    expect(result.brandId).toBeDefined();
    expect(typeof result.brandId).toBe('number');
  });

  /*
   * ⚠️ 브랜드 격리 정책 관련 참고사항:
   *
   * 클라이언트(documentApi)에는 brandId 기반 필터링 로직이 없습니다.
   * brandId에 의한 데이터 격리는 전적으로 서버 책임입니다:
   *   - 서버는 JWT 토큰에서 brandId를 추출하여 쿼리에 자동 적용
   *   - 클라이언트가 다른 brandId의 문서를 요청해도 서버에서 403/404 반환
   *   - 따라서 클라이언트 단위 테스트에서는 brandId 필터링을 검증할 수 없음
   *
   * brandId 격리의 완전한 검증은 E2E 또는 서버 통합 테스트에서 수행해야 합니다.
   */
  it('클라이언트에 brandId 필터 로직이 없음을 확인 (서버 책임)', async () => {
    // 서버가 다른 brandId의 문서를 반환하더라도 클라이언트는 그대로 반환
    // (실제로는 서버에서 이를 방지해야 함)
    const mixedBrandDocs = [
      fakeDocument({ id: 1, brandId: 10 }),
      fakeDocument({ id: 2, brandId: 20 }), // 다른 브랜드
    ];
    mock.onGet('/api/documents').reply(200, { data: mixedBrandDocs });

    const result = await documentApi.getList();

    // 클라이언트는 필터 없이 그대로 반환 (서버가 격리 책임)
    expect(result).toHaveLength(2);
    expect(result[0].brandId).toBe(10);
    expect(result[1].brandId).toBe(20);
  });
});
