import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventRecorder } from '../../src/runtime/eventRecorder.js';

describe('EventRecorder', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
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
});
