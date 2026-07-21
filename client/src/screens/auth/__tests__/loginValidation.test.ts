import { extractStoreCode, getLoginRequiredError } from '../loginValidation';

describe('getLoginRequiredError()', () => {
  it('직원 아이디나 비밀번호가 없으면 오류 메시지를 반환한다', () => {
    expect(getLoginRequiredError('', 'Test1234!')).toBe('직원 아이디와 비밀번호를 입력해주세요.');
    expect(getLoginRequiredError('1001ABCD!', '')).toBe('직원 아이디와 비밀번호를 입력해주세요.');
  });

  it('직원 아이디 형식이 잘못되면 오류 메시지를 반환한다', () => {
    expect(getLoginRequiredError('ABCD1234!', 'Test1234!')).toBe(
      '직원 아이디 형식이 올바르지 않습니다. (예: 1001ABCD!)'
    );
    expect(getLoginRequiredError('1001abcd', 'Test1234!')).toBe(
      '직원 아이디 형식이 올바르지 않습니다. (예: 1001ABCD!)'
    );
    expect(getLoginRequiredError('10AB1234!', 'Test1234!')).toBe(
      '직원 아이디 형식이 올바르지 않습니다. (예: 1001ABCD!)'
    );
  });

  it('형식이 올바르고 두 필드가 모두 있으면 빈 문자열을 반환한다', () => {
    expect(getLoginRequiredError('1001ABCD!', 'Test1234!')).toBe('');
    expect(getLoginRequiredError('2048ZZZZ@', 'pw')).toBe('');
  });
});

describe('extractStoreCode()', () => {
  it('직원 아이디 앞 4자리를 점별 코드로 반환한다', () => {
    expect(extractStoreCode('1001ABCD!')).toBe('1001');
    expect(extractStoreCode('2048ZZZZ@')).toBe('2048');
  });
});
