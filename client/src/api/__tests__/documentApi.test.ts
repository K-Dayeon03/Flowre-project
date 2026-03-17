import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import { documentApi, Document, DocumentCategory, PresignedUrlResponse } from '../documentApi';

const mock = new MockAdapter(apiClient);

afterEach(() => {
  mock.reset();
  jest.restoreAllMocks();
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

// ── getList() ─────────────────────────────────────────────────────
describe('documentApi.getList()', () => {
  it('GET /api/documents 호출 → Document[] 반환', async () => {
    const list = [fakeDocument(), fakeDocument({ id: 2, title: '공지사항', category: 'NOTICE' })];
    mock.onGet('/api/documents').reply(200, { data: list });

    const result = await documentApi.getList();
    expect(result).toEqual(list);
    expect(result).toHaveLength(2);
  });

  it('category=MANUAL 쿼리 파라미터 포함', async () => {
    const manuals = [fakeDocument({ category: 'MANUAL' })];
    mock.onGet('/api/documents', { params: { category: 'MANUAL' } }).reply(200, { data: manuals });

    const result = await documentApi.getList({ category: 'MANUAL' });
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('MANUAL');
  });

  it('category=NOTICE 필터 동작', async () => {
    const notices = [fakeDocument({ id: 3, category: 'NOTICE', title: '3월 공지' })];
    mock.onGet('/api/documents', { params: { category: 'NOTICE' } }).reply(200, { data: notices });

    const result = await documentApi.getList({ category: 'NOTICE' });
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('NOTICE');
  });

  it('category=REPORT 필터 동작', async () => {
    const reports = [fakeDocument({ id: 4, category: 'REPORT', title: '월간 리포트' })];
    mock.onGet('/api/documents', { params: { category: 'REPORT' } }).reply(200, { data: reports });

    const result = await documentApi.getList({ category: 'REPORT' });
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('REPORT');
  });

  it('params 없이 호출 시 전체 문서 반환', async () => {
    const all = [
      fakeDocument({ id: 1, category: 'MANUAL' }),
      fakeDocument({ id: 2, category: 'NOTICE' }),
      fakeDocument({ id: 3, category: 'REPORT' }),
    ];
    mock.onGet('/api/documents').reply(200, { data: all });

    const result = await documentApi.getList();
    expect(result).toHaveLength(3);
  });
});

// ── getById() ────────────────────────────────────────────────────
describe('documentApi.getById()', () => {
  it('GET /api/documents/1 → 단건 Document 반환', async () => {
    const doc = fakeDocument({ id: 1 });
    mock.onGet('/api/documents/1').reply(200, { data: doc });

    const result = await documentApi.getById(1);
    expect(result).toEqual(doc);
    expect(result.id).toBe(1);
  });

  it('서버 404 응답 시 에러 throw', async () => {
    mock.onGet('/api/documents/999').reply(404, { message: 'Not Found' });

    await expect(documentApi.getById(999)).rejects.toThrow();
  });
});

// ── getPresignedUrl() (S3 Presigned URL 발급) ────────────────────
describe('documentApi.getPresignedUrl()', () => {
  it('POST /api/documents/presigned-url 호출 + body 검증', async () => {
    const presignedRes: PresignedUrlResponse = {
      presignedUrl: 'https://s3.amazonaws.com/flowre/upload?X-Amz-Signature=abc123',
      s3Key: 'documents/2026/03/report.pdf',
    };

    mock.onPost('/api/documents/presigned-url').reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.fileName).toBe('report.pdf');
      expect(body.contentType).toBe('application/pdf');
      return [200, { data: presignedRes }];
    });

    const result = await documentApi.getPresignedUrl('report.pdf', 'application/pdf');
    expect(result.presignedUrl).toContain('X-Amz-Signature');
    expect(result.s3Key).toBe('documents/2026/03/report.pdf');
  });

  it('xlsx 파일에 대한 presigned URL 발급', async () => {
    const presignedRes: PresignedUrlResponse = {
      presignedUrl: 'https://s3.amazonaws.com/flowre/upload?sig=xyz',
      s3Key: 'documents/2026/03/data.xlsx',
    };

    mock.onPost('/api/documents/presigned-url').reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.fileName).toBe('data.xlsx');
      expect(body.contentType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return [200, { data: presignedRes }];
    });

    const result = await documentApi.getPresignedUrl(
      'data.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(result.s3Key).toContain('data.xlsx');
  });
});

// ── uploadToS3() (S3 직접 PUT) ──────────────────────────────────
describe('documentApi.uploadToS3()', () => {
  const presignedUrl = 'https://s3.amazonaws.com/flowre/upload?X-Amz-Signature=abc123';

  beforeEach(() => {
    // global.fetch mock 설정 (uploadToS3는 native fetch 사용)
    global.fetch = jest.fn();
  });

  afterEach(() => {
    // @ts-ignore
    delete global.fetch;
  });

  it('presignedUrl로 PUT 요청 발송 확인', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    const blob = new Blob(['dummy pdf content'], { type: 'application/pdf' });
    await documentApi.uploadToS3(presignedUrl, blob, 'application/pdf');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(presignedUrl, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': 'application/pdf' },
    });
  });

  it('headers에 Content-Type 포함 + method: PUT 확인', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    const blob = new Blob(['xlsx data'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await documentApi.uploadToS3(
      presignedUrl,
      blob,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    expect(callArgs[1].method).toBe('PUT');
    expect(callArgs[1].headers['Content-Type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });

  it('body에 Blob 포함 확인', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    const blob = new Blob(['file content'], { type: 'application/pdf' });
    await documentApi.uploadToS3(presignedUrl, blob, 'application/pdf');

    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    expect(callArgs[1].body).toBe(blob);
    expect(callArgs[1].body).toBeInstanceOf(Blob);
  });

  it('4xx 응답 시 에러를 throw함 (S3 URL 만료)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden - URL Expired',
    });

    const blob = new Blob(['content'], { type: 'application/pdf' });

    await expect(
      documentApi.uploadToS3(presignedUrl, blob, 'application/pdf'),
    ).rejects.toThrow('S3 upload failed: 403 Forbidden - URL Expired');
  });

  it('네트워크 에러 시 에러 propagation', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Network request failed'));

    const blob = new Blob(['content'], { type: 'application/pdf' });

    await expect(
      documentApi.uploadToS3(presignedUrl, blob, 'application/pdf'),
    ).rejects.toThrow('Network request failed');
  });
});

// ── create() (문서 메타데이터 등록) ──────────────────────────────
describe('documentApi.create()', () => {
  it('POST /api/documents body 검증 + Document 반환', async () => {
    const created = fakeDocument({ id: 50, title: '신규 매뉴얼', s3Url: 'https://s3/new.pdf' });

    mock.onPost('/api/documents').reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.title).toBe('신규 매뉴얼');
      expect(body.category).toBe('MANUAL');
      expect(body.s3Key).toBe('documents/2026/03/new.pdf');
      return [201, { data: created }];
    });

    const result = await documentApi.create({
      title: '신규 매뉴얼',
      category: 'MANUAL',
      s3Key: 'documents/2026/03/new.pdf',
    });
    expect(result).toEqual(created);
  });

  it('description 없이 생성 가능 (optional 필드)', async () => {
    const created = fakeDocument({ id: 51, description: undefined });

    mock.onPost('/api/documents').reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.description).toBeUndefined();
      return [201, { data: created }];
    });

    const result = await documentApi.create({
      title: '제목만',
      category: 'NOTICE',
      s3Key: 'documents/notice.pdf',
    });
    expect(result.id).toBe(51);
  });

  it('description 포함 케이스', async () => {
    const created = fakeDocument({ id: 52, description: '상세 설명 포함' });

    mock.onPost('/api/documents').reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.description).toBe('상세 설명 포함');
      return [201, { data: created }];
    });

    const result = await documentApi.create({
      title: '리포트',
      category: 'REPORT',
      s3Key: 'documents/report.pdf',
      description: '상세 설명 포함',
    });
    expect(result.description).toBe('상세 설명 포함');
  });

  it('반환된 Document에 brandId 존재 확인 (격리 검증)', async () => {
    const created = fakeDocument({ id: 53, brandId: 10 });

    mock.onPost('/api/documents').reply(201, { data: created });

    const result = await documentApi.create({
      title: '브랜드 문서',
      category: 'MANUAL',
      s3Key: 'documents/brand.pdf',
    });
    expect(result.brandId).toBeDefined();
    expect(typeof result.brandId).toBe('number');
    expect(result.brandId).toBe(10);
  });
});

// ── delete() ─────────────────────────────────────────────────────
describe('documentApi.delete()', () => {
  it('DELETE /api/documents/1 호출', async () => {
    mock.onDelete('/api/documents/1').reply(200);

    await expect(documentApi.delete(1)).resolves.toBeUndefined();
  });

  it('서버 에러 시 에러 propagation', async () => {
    mock.onDelete('/api/documents/999').reply(500, { message: 'Internal Server Error' });

    await expect(documentApi.delete(999)).rejects.toThrow();
  });
});

// ── 전체 업로드 시나리오 통합 테스트 ─────────────────────────────
describe('전체 업로드 플로우: presignedUrl 발급 → S3 업로드 → 메타데이터 등록', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    // @ts-ignore
    delete global.fetch;
  });

  it('3단계 플로우가 올바른 순서로 호출됨', async () => {
    const callOrder: string[] = [];

    // 1단계: Presigned URL 발급
    const presignedRes: PresignedUrlResponse = {
      presignedUrl: 'https://s3.amazonaws.com/flowre/upload?sig=test',
      s3Key: 'documents/2026/03/report.pdf',
    };
    mock.onPost('/api/documents/presigned-url').reply(() => {
      callOrder.push('getPresignedUrl');
      return [200, { data: presignedRes }];
    });

    // 2단계: S3 PUT
    (global.fetch as jest.Mock).mockImplementation(() => {
      callOrder.push('uploadToS3');
      return Promise.resolve({ ok: true, status: 200 });
    });

    // 3단계: 메타데이터 등록
    const createdDoc = fakeDocument({
      id: 100,
      title: '분기 리포트',
      category: 'REPORT',
      s3Url: 'https://s3.amazonaws.com/flowre/documents/2026/03/report.pdf',
    });
    mock.onPost('/api/documents').reply(() => {
      callOrder.push('create');
      return [201, { data: createdDoc }];
    });

    // 실행: 실제 업로드 플로우 시뮬레이션
    const file = new Blob(['PDF content'], { type: 'application/pdf' });

    // Step 1: presigned URL 발급
    const { presignedUrl, s3Key } = await documentApi.getPresignedUrl('report.pdf', 'application/pdf');
    expect(presignedUrl).toContain('sig=test');

    // Step 2: S3 직접 업로드
    await documentApi.uploadToS3(presignedUrl, file, 'application/pdf');

    // Step 3: 서버에 메타데이터 등록
    const result = await documentApi.create({
      title: '분기 리포트',
      category: 'REPORT',
      s3Key,
      description: '2026년 1분기 리포트',
    });

    // 순서 검증
    expect(callOrder).toEqual(['getPresignedUrl', 'uploadToS3', 'create']);

    // 결과 검증
    expect(result.id).toBe(100);
    expect(result.title).toBe('분기 리포트');
    expect(result.brandId).toBeDefined();

    // S3 업로드가 서버를 경유하지 않고 직접 presignedUrl로 호출됐는지 확인
    expect(global.fetch).toHaveBeenCalledWith(
      presignedUrl,
      expect.objectContaining({
        method: 'PUT',
        body: file,
      }),
    );
  });

  it('presigned URL 발급 실패 시 후속 단계 미실행', async () => {
    mock.onPost('/api/documents/presigned-url').reply(500, { message: 'Server Error' });

    await expect(
      documentApi.getPresignedUrl('report.pdf', 'application/pdf'),
    ).rejects.toThrow();

    // fetch(S3 업로드)가 호출되지 않았는지 확인
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
