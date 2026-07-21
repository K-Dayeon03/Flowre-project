const EMPLOYEE_CODE_PATTERN = /^\d{4}[A-Za-z]{4}[!@#$%^&*?]$/;

/** 직원 아이디·비밀번호 필수 입력 및 형식 오류 메시지를 반환합니다. */
export function getLoginRequiredError(employeeCode: string, password: string): string {
  if (!employeeCode || !password) {
    return '직원 아이디와 비밀번호를 입력해주세요.';
  }
  if (!EMPLOYEE_CODE_PATTERN.test(employeeCode)) {
    return '직원 아이디 형식이 올바르지 않습니다. (예: 1001ABCD!)';
  }
  return '';
}

/** 직원 아이디 앞 4자리를 점별 코드로 추출합니다. */
export function extractStoreCode(employeeCode: string): string {
  return employeeCode.slice(0, 4);
}
