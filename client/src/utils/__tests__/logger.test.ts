import { logger } from '../logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = global as any;

describe('logger', () => {
  let debugSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    debugSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  // jest.setup.js에서 __DEV__ = false 로 강제되므로, 운영 모드 동작을 검증한다.
  it('운영 모드(__DEV__=false): debug/info는 출력하지 않는다', () => {
    expect(g.__DEV__).toBe(false);

    logger.debug('debug msg');
    logger.info('info msg');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('warn/error는 운영 모드에서도 항상 출력하며 인자를 그대로 위임한다', () => {
    const err = new Error('boom');
    logger.warn('[Tag] 경고', 42);
    logger.error('[Tag] 에러', err);

    expect(warnSpy).toHaveBeenCalledWith('[Tag] 경고', 42);
    expect(errorSpy).toHaveBeenCalledWith('[Tag] 에러', err);
  });
});
