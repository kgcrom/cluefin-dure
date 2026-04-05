import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseBacktestCommandArgs } from '../../src/main.js';
import {
  DEFAULT_BACKTEST_TIMEOUT_MS,
  timeoutMinutesToMs,
  resolveBacktestTimeoutMs,
  withBacktestTimeout,
} from '../../src/workflow/backtestTimeout.js';

describe('backtest timeout helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('기본 timeout은 7분이다', () => {
    expect(resolveBacktestTimeoutMs(undefined)).toBe(DEFAULT_BACKTEST_TIMEOUT_MS);
  });

  it('0이면 timeout을 비활성화한다', () => {
    expect(resolveBacktestTimeoutMs(0)).toBeUndefined();
    expect(timeoutMinutesToMs(0)).toBe(0);
  });

  it('withBacktestTimeout은 시간 초과 시 onTimeout을 호출한다', async () => {
    const onTimeout = vi.fn().mockResolvedValue(undefined);
    const promise = withBacktestTimeout(
      async () => new Promise<void>(() => undefined),
      { onTimeout },
    );
    const expected = expect(promise).rejects.toThrow('백테스트가 7분 제한 시간을 초과했습니다.');

    await vi.advanceTimersByTimeAsync(DEFAULT_BACKTEST_TIMEOUT_MS);

    await expected;
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });
});

describe('parseBacktestCommandArgs', () => {
  it('strategyId만 있으면 timeoutMinutes는 undefined', () => {
    expect(parseBacktestCommandArgs(['strategy-1'])).toEqual({
      strategyId: 'strategy-1',
      timeoutMinutes: undefined,
    });
  });

  it('timeoutMinutes 0을 허용한다', () => {
    expect(parseBacktestCommandArgs(['strategy-1', '--timeout-minutes', '0'])).toEqual({
      strategyId: 'strategy-1',
      timeoutMinutes: 0,
    });
  });

  it('--timeout-minutes=10 형식을 허용한다', () => {
    expect(parseBacktestCommandArgs(['strategy-1', '--timeout-minutes=10'])).toEqual({
      strategyId: 'strategy-1',
      timeoutMinutes: 10,
    });
  });

  it('음수 timeout은 거부한다', () => {
    expect(() => parseBacktestCommandArgs(['strategy-1', '--timeout-minutes', '-1'])).toThrow(
      '--timeout-minutes 값은 0 이상의 숫자여야 합니다.',
    );
  });
});
