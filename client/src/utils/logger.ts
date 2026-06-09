/**
 * 공통 로거 유틸
 *
 * `console.*` 직접 호출을 한 곳으로 모아, 추후 원격 로깅(Sentry 등) 연동과
 * 로그 레벨 제어를 단일 지점에서 처리하기 위한 래퍼다.
 * CLAUDE.md 규칙: `console.log` 대신 `logger`를 사용한다.
 *
 * 레벨 정책:
 * - `debug` / `info` : 개발 모드(`__DEV__`)에서만 출력 — 운영 콘솔 노이즈 방지
 * - `warn` / `error` : 항상 출력 — 운영 환경 진단에 필요
 *
 * 인자는 `console`로 그대로 위임하므로 호출부에서 접두어/추가 인자를 자유롭게 넘긴다.
 */
const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

export const logger = {
  /**
   * 디버그 로그 (개발 모드 전용)
   * @param args 출력할 값들
   */
  debug: (...args: unknown[]): void => {
    if (isDev) {
      console.debug(...args);
    }
  },

  /**
   * 정보 로그 (개발 모드 전용)
   * @param args 출력할 값들
   */
  info: (...args: unknown[]): void => {
    if (isDev) {
      console.info(...args);
    }
  },

  /**
   * 경고 로그 (항상 출력)
   * @param args 출력할 값들
   */
  warn: (...args: unknown[]): void => {
    console.warn(...args);
  },

  /**
   * 에러 로그 (항상 출력)
   * @param args 출력할 값들
   */
  error: (...args: unknown[]): void => {
    console.error(...args);
  },
};
