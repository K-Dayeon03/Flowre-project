import { getLoginRequiredError } from '../loginValidation';

describe('getLoginRequiredError()', () => {
  it('점별 코드, 직원 아이디, 비밀번호 중 하나라도 없으면 오류 메시지를 반환한다', () => {
    expect(getLoginRequiredError('', '1001ABCD!', 'Test1234!')).toBe(
      '점별 코드, 직원 아이디, 비밀번호를 입력해주세요.'
    );
    expect(getLoginRequiredError('1001', '', 'Test1234!')).toBe(
      '점별 코드, 직원 아이디, 비밀번호를 입력해주세요.'
    );
    expect(getLoginRequiredError('1001', '1001ABCD!', '')).toBe(
      '점별 코드, 직원 아이디, 비밀번호를 입력해주세요.'
    );
  });

  it('3개 필드가 모두 있으면 빈 문자열을 반환한다', () => {
    expect(getLoginRequiredError('1001', '1001ABCD!', 'Test1234!')).toBe('');
  });
});
