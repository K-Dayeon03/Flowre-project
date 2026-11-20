import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import { hubApi } from '../hubApi';

const mock = new MockAdapter(apiClient);

afterEach(() => {
  mock.reset();
});

describe('hubApi.getSummary()', () => {
  it('허브 요약을 조회한다', async () => {
    const summary = {
      unreadNoticeCount: 1,
      unreadChatCount: 2,
      pendingScheduleCount: 3,
      pendingInquiryCount: 4,
      pendingAsCount: 5,
      recentNotifications: [],
      recentDocuments: [],
    };
    mock.onGet('/api/hub/summary').reply(200, { data: summary });

    const result = await hubApi.getSummary();

    expect(result).toEqual(summary);
  });
});

describe('hubApi.search()', () => {
  it('통합 검색어를 전달한다', async () => {
    const results = [{ type: 'NOTICE', resourceId: 1, title: '공지', subtitle: '본사' }];
    mock.onGet('/api/hub/search', { params: { query: '공지' } }).reply(200, { data: results });

    const result = await hubApi.search('공지');

    expect(result).toEqual(results);
  });
});

