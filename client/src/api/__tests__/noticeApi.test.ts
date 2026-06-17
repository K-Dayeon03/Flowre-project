import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import { Notice, noticeApi } from '../noticeApi';

const mock = new MockAdapter(apiClient);

afterEach(() => {
  mock.reset();
});

const fakeNotice = (overrides?: Partial<Notice>): Notice => ({
  id: 1,
  title: '운영 공지',
  content: '오늘 전달사항입니다.',
  pinned: true,
  authorName: '관리자',
  read: false,
  createdAt: '2026-06-18T09:00:00',
  ...overrides,
});

describe('noticeApi', () => {
  it('공지 목록을 조회한다', async () => {
    const notices = [fakeNotice()];
    mock.onGet('/api/notices').reply(200, { data: notices });

    await expect(noticeApi.getNotices()).resolves.toEqual(notices);
  });

  it('읽지 않은 공지 수를 조회한다', async () => {
    mock.onGet('/api/notices/unread-count').reply(200, { data: { count: 3 } });

    await expect(noticeApi.getUnreadCount()).resolves.toBe(3);
  });

  it('공지 작성 body를 서버로 전송한다', async () => {
    const created = fakeNotice({ id: 2, title: '새 공지', pinned: false });
    mock.onPost('/api/notices').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({ title: '새 공지', content: '본문', pinned: false });
      return [200, { data: created }];
    });

    const result = await noticeApi.createNotice({ title: '새 공지', content: '본문', pinned: false });

    expect(result).toEqual(created);
  });

  it('공지 읽음 처리를 호출한다', async () => {
    mock.onPost('/api/notices/1/read').reply(200, { data: null });

    await expect(noticeApi.markRead(1)).resolves.toBeUndefined();
  });
});
