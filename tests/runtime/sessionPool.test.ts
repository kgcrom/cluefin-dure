import { afterEach, describe, expect, it } from 'vitest';
import { getDefaultMaxConcurrentSessions, SessionPool } from '../../src/runtime/sessionPool.js';

describe('SessionPool', () => {
  const originalMaxConcurrent = process.env.DURE_MAX_CONCURRENT_SESSIONS;

  afterEach(() => {
    if (originalMaxConcurrent === undefined) {
      delete process.env.DURE_MAX_CONCURRENT_SESSIONS;
    } else {
      process.env.DURE_MAX_CONCURRENT_SESSIONS = originalMaxConcurrent;
    }
  });

  it('maxConcurrent를 넘지 않고 queued work를 순서대로 진행한다', async () => {
    const pool = new SessionPool(2);
    let running = 0;
    let observedMax = 0;

    await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        pool.acquire(async () => {
          running++;
          observedMax = Math.max(observedMax, running);
          await new Promise((resolve) => setTimeout(resolve, 5));
          running--;
          return index;
        }),
      ),
    );

    expect(observedMax).toBe(2);
  });

  it('rejected task 이후에도 다음 queued work를 실행한다', async () => {
    const pool = new SessionPool(1);
    const completed: string[] = [];

    const first = pool
      .acquire(async () => {
        completed.push('first');
        throw new Error('boom');
      })
      .catch((error) => error as Error);
    const second = pool.acquire(async () => {
      completed.push('second');
      return 'ok';
    });

    await expect(first).resolves.toMatchObject({ message: 'boom' });
    await expect(second).resolves.toBe('ok');
    expect(completed).toEqual(['first', 'second']);
  });

  it('DURE_MAX_CONCURRENT_SESSIONS가 유효하면 기본 동시성으로 사용한다', () => {
    process.env.DURE_MAX_CONCURRENT_SESSIONS = '7';

    expect(getDefaultMaxConcurrentSessions()).toBe(7);
  });

  it('DURE_MAX_CONCURRENT_SESSIONS가 잘못되면 기본값 3으로 fallback한다', () => {
    process.env.DURE_MAX_CONCURRENT_SESSIONS = '0';
    expect(getDefaultMaxConcurrentSessions()).toBe(3);

    process.env.DURE_MAX_CONCURRENT_SESSIONS = 'invalid';
    expect(getDefaultMaxConcurrentSessions()).toBe(3);
  });
});
