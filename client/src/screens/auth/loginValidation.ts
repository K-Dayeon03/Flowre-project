/** 3개 로그인 필드의 필수 입력 오류 메시지를 반환합니다. */
export function getLoginRequiredError(storeCode: string, employeeCode: string, password: string) {
  if (!storeCode || !employeeCode || !password) {
    return '점별 코드, 직원 아이디, 비밀번호를 입력해주세요.';
  }
  return '';
}
