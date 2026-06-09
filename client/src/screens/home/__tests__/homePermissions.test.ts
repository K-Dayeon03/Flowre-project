import { canManageStores } from '../homePermissions';

describe('canManageStores()', () => {
  it('ADMIN과 HQ_STAFF에게 매장 등록 액션을 허용한다', () => {
    expect(canManageStores('ADMIN')).toBe(true);
    expect(canManageStores('HQ_STAFF')).toBe(true);
  });

  it('매장 역할에게 매장 등록 액션을 숨긴다', () => {
    expect(canManageStores('STORE_MANAGER')).toBe(false);
    expect(canManageStores('STORE_STAFF')).toBe(false);
  });
});
