import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  AgentSession,
  AgentSessionEvent,
  AgentToolUpdateCallback,
} from '@mariozechner/pi-coding-agent';
import { log } from './log.js';

interface RecordedEvent {
  timestamp: number;
  sessionLabel: string;
  type: string;
  data?: unknown;
}

export class EventRecorder {
  private events: RecordedEvent[] = [];
  private unsubscribes: (() => void)[] = [];

  attachToSession(
    sessionLabel: string,
    session: AgentSession,
    onUpdate?: AgentToolUpdateCallback<null>,
  ): void {
    const emit = onUpdate
      ? (msg: string) => onUpdate({ content: [{ type: 'text', text: msg }], details: null })
      : log;

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
        emit(`[${sessionLabel}] ${event.assistantMessageEvent.delta}`);
      }

      if (event.type === 'turn_end') {
        emit(`\n[${sessionLabel}] --- turn end ---`);
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
