import { PassThrough } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPiLogSink, log, withLogSink } from '../../src/runtime/log.js';

describe('PiLogSink', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('appendLine 누적 내용을 onUpdate로 전달', () => {
    vi.useFakeTimers();
    const updates: Array<{ content: [{ text: string }]; details: { logs: string } }> = [];
    const sink = createPiLogSink((update) => updates.push(update as never), {
      flushIntervalMs: 100,
    });

    sink.appendLine('first');
    sink.appendLine('second');

    vi.advanceTimersByTime(100);

    expect(updates).toHaveLength(1);
    expect(updates[0]?.content[0].text).toBe('first\nsecond');
    expect(updates[0]?.details.logs).toBe('first\nsecond\n');
  });

  it('서로 다른 sink 상태를 섞지 않는다', () => {
    const left = createPiLogSink();
    const right = createPiLogSink();

    left.appendLine('left only');
    right.appendLine('right only');

    expect(left.getSnapshot().logs).toBe('left only\n');
    expect(right.getSnapshot().logs).toBe('right only\n');
  });

  it('withLogSink 사용 시 log()가 console.log를 호출하지 않는다', async () => {
    vi.useFakeTimers();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const updates: Array<{ content: [{ text: string }] }> = [];
    const sink = createPiLogSink((update) => updates.push(update as never), {
      flushIntervalMs: 100,
    });

    await withLogSink(sink, async () => {
      log('captured');
      vi.advanceTimersByTime(100);
    });

    expect(consoleSpy).not.toHaveBeenCalled();
    expect(updates[0]?.content[0].text).toBe('captured');
  });

  it('attachStream은 줄바꿈 없는 마지막 chunk도 flush한다', async () => {
    const sink = createPiLogSink();
    const stream = new PassThrough();

    sink.attachStream(stream, 'rpc');
    stream.write('first');
    stream.write(' second\nthird');
    stream.end();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(sink.getSnapshot().logs).toBe('[rpc] first second\n[rpc] third\n');
  });
});
