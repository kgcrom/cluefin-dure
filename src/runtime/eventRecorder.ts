import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  AgentSession,
  AgentSessionEvent,
  AgentToolUpdateCallback,
} from '@mariozechner/pi-coding-agent';
import { createPiLogSink, getCurrentLogSink, log, type PiLogSink } from './log.js';

interface RecordedEvent {
  timestamp: number;
  sessionLabel: string;
  type: string;
  data?: unknown;
}

export class EventRecorder {
  private events: RecordedEvent[] = [];
  private unsubscribes: (() => void)[] = [];

  constructor(private readonly logSink?: PiLogSink) {}

  attachToSession(
    sessionLabel: string,
    session: AgentSession,
    onUpdate?: AgentToolUpdateCallback<null>,
  ): void {
    const sink = this.logSink ?? getCurrentLogSink() ?? createPiLogSink(onUpdate);
    const emit = sink ? (msg: string) => sink.appendLine(msg) : log;

    let buffer = '';

    const unsub = session.subscribe((event: AgentSessionEvent) => {
      this.events.push({
        timestamp: Date.now(),
        sessionLabel,
        type: event.type,
      });

      if (
        event.type === 'message_update' &&
        'assistantMessageEvent' in event &&
        event.assistantMessageEvent.type === 'text_delta'
      ) {
        buffer += event.assistantMessageEvent.delta;
        let nlIdx = buffer.indexOf('\n');
        while (nlIdx !== -1) {
          const line = buffer.slice(0, nlIdx);
          emit(`[${sessionLabel}] ${line}`);
          buffer = buffer.slice(nlIdx + 1);
          nlIdx = buffer.indexOf('\n');
        }
      }

      if (event.type === 'turn_end') {
        if (buffer.length > 0) {
          emit(`[${sessionLabel}] ${buffer}`);
          buffer = '';
        }
        const msg = event.message as unknown as Record<string, unknown> | undefined;
        if (msg?.role === 'assistant') {
          const stopReason = msg.stopReason as string | undefined;
          const errorMessage = msg.errorMessage as string | undefined;
          if ((stopReason === 'error' || stopReason === 'aborted') && errorMessage) {
            emit(`[${sessionLabel}] ⚠ provider error (${stopReason}): ${errorMessage}`);
          }
        }
        emit(`[${sessionLabel}] --- turn end ---`);
      }

      if (event.type === 'auto_retry_start') {
        const e = event as unknown as Record<string, unknown>;
        emit(
          `[${sessionLabel}] ⚠ retrying (${e.attempt}/${e.maxAttempts}, delay ${e.delayMs}ms): ${e.errorMessage}`,
        );
      }

      if (event.type === 'auto_retry_end') {
        const e = event as unknown as Record<string, unknown>;
        if (e.success === false) {
          emit(`[${sessionLabel}] ✗ retry failed after ${e.attempt} attempts: ${e.finalError}`);
        }
      }
    });
    this.unsubscribes.push(unsub);
  }

  async persist(runId: string, baseDir: string): Promise<void> {
    const dir = path.join(baseDir, runId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'events.json'), JSON.stringify(this.events, null, 2));
  }

  dispose(): void {
    for (const unsub of this.unsubscribes) unsub();
    this.unsubscribes = [];
  }
}
