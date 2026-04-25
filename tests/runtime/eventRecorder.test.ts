import { mkdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventRecorder } from '../../src/runtime/eventRecorder.js';

describe('EventRecorder', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    return Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true }))).then(
      () => {
        tempDirs.length = 0;
      },
    );
  });

  it('onUpdate가 있으면 stderr에 직접 쓰지 않는다', () => {
    vi.useFakeTimers();
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const onUpdate = vi.fn();
    let handler: ((event: unknown) => void) | undefined;

    const session = {
      subscribe(fn: (event: unknown) => void) {
        handler = fn;
        return () => {};
      },
    };

    const recorder = new EventRecorder();
    recorder.attachToSession('fundamental:005930', session as never, onUpdate);

    handler?.({
      type: 'message_update',
      assistantMessageEvent: {
        type: 'text_delta',
        delta: 'line 1\nline 2',
      },
    });
    handler?.({
      type: 'turn_end',
      message: {
        role: 'assistant',
      },
    });

    vi.runAllTimers();

    expect(stderrSpy).not.toHaveBeenCalled();
    expect(onUpdate).toHaveBeenCalled();
    const latest = onUpdate.mock.calls.at(-1)?.[0];
    expect(latest.content[0].text).toContain('[fundamental:005930] line 1');
    expect(latest.content[0].text).toContain('[fundamental:005930] line 2');
    expect(latest.content[0].text).toContain('[fundamental:005930] --- turn end ---');
  });

  it('retry와 provider error metadata를 events.json에 저장한다', async () => {
    let handler: ((event: unknown) => void) | undefined;
    const session = {
      subscribe(fn: (event: unknown) => void) {
        handler = fn;
        return () => {};
      },
    };
    const recorder = new EventRecorder();
    recorder.attachToSession('critic:test', session as never);

    handler?.({ type: 'turn_start' });
    handler?.({
      type: 'auto_retry_start',
      attempt: 1,
      maxAttempts: 3,
      delayMs: 1000,
      errorMessage: 'rate limit',
    });
    handler?.({
      type: 'auto_retry_end',
      success: false,
      attempt: 3,
      finalError: 'still rate limited',
    });
    handler?.({
      type: 'turn_end',
      message: {
        role: 'assistant',
        stopReason: 'error',
        errorMessage: 'provider failed',
      },
    });

    const tempDir = path.join(os.tmpdir(), `event-recorder-${Date.now()}`);
    tempDirs.push(tempDir);
    await mkdir(tempDir, { recursive: true });
    await recorder.persist('run-1', tempDir);

    const raw = await readFile(path.join(tempDir, 'run-1', 'events.json'), 'utf-8');
    const events = JSON.parse(raw);

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'auto_retry_start',
          data: {
            attempt: 1,
            maxAttempts: 3,
            delayMs: 1000,
            errorMessage: 'rate limit',
          },
        }),
        expect.objectContaining({
          type: 'auto_retry_end',
          data: {
            success: false,
            attempt: 3,
            finalError: 'still rate limited',
          },
        }),
        expect.objectContaining({
          type: 'turn_end',
          data: expect.objectContaining({
            role: 'assistant',
            stopReason: 'error',
            errorMessage: 'provider failed',
            durationMs: expect.any(Number),
          }),
        }),
      ]),
    );
  });
});
