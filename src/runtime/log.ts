import type { Readable } from 'node:stream';
import type { AgentToolUpdateCallback } from '@mariozechner/pi-coding-agent';

export interface PiLogDetails {
  logs: string;
  visibleText: string;
  lineCount: number;
}

export interface PiLogSnapshot extends PiLogDetails {}

export interface PiLogSinkOptions {
  flushIntervalMs?: number;
  maxVisibleLines?: number;
}

type LogUpdate = {
  content: [{ type: 'text'; text: string }];
  details: PiLogDetails;
};

let writer: (msg: string) => void = (msg) => console.log(msg);
const sinkStack: PiLogSink[] = [];

function normalizeText(text: string): string {
  return text.replaceAll('\r\n', '\n');
}

export class PiLogSink {
  private readonly flushIntervalMs: number;
  private readonly maxVisibleLines: number;
  private readonly onUpdate?: (update: LogUpdate) => void;
  private text = '';
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(onUpdate?: (update: LogUpdate) => void, options: PiLogSinkOptions = {}) {
    this.onUpdate = onUpdate;
    this.flushIntervalMs = options.flushIntervalMs ?? 150;
    this.maxVisibleLines = options.maxVisibleLines ?? 12;
  }

  append(text: string): void {
    if (text.length === 0) return;
    this.text += normalizeText(text);
    this.scheduleFlush();
  }

  appendLine(text: string): void {
    if (text.length === 0) return;
    this.append(text.endsWith('\n') ? text : `${text}\n`);
  }

  attachStream(stream: Readable, label?: string): () => void {
    let buffer = '';

    const emitLine = (line: string) => {
      const normalized = label ? `[${label}] ${line}` : line;
      this.appendLine(normalized);
    };

    const flushBuffer = () => {
      if (buffer.length === 0) return;
      emitLine(buffer);
      buffer = '';
    };

    const onData = (chunk: Buffer | string) => {
      buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      buffer = normalizeText(buffer);

      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        emitLine(buffer.slice(0, newlineIndex));
        buffer = buffer.slice(newlineIndex + 1);
        newlineIndex = buffer.indexOf('\n');
      }
    };

    const onEnd = () => {
      flushBuffer();
    };

    stream.on('data', onData);
    stream.on('end', onEnd);
    stream.on('close', onEnd);

    return () => {
      stream.off('data', onData);
      stream.off('end', onEnd);
      stream.off('close', onEnd);
      flushBuffer();
    };
  }

  flush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.emitUpdate();
  }

  finish(summary?: string): PiLogSnapshot {
    if (summary) {
      this.appendLine(summary);
    }
    this.flush();
    return this.getSnapshot();
  }

  getSnapshot(): PiLogSnapshot {
    const logs = this.text;
    const lines = logs.length === 0 ? [] : logs.replace(/\n$/, '').split('\n');
    const visibleLines =
      lines.length <= this.maxVisibleLines ? lines : lines.slice(-this.maxVisibleLines);

    return {
      logs,
      visibleText: visibleLines.join('\n'),
      lineCount: lines.length,
    };
  }

  private scheduleFlush(): void {
    if (!this.onUpdate) return;
    if (this.flushTimer) return;

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.emitUpdate();
    }, this.flushIntervalMs);
    this.flushTimer.unref?.();
  }

  private emitUpdate(): void {
    if (!this.onUpdate) return;
    const snapshot = this.getSnapshot();
    this.onUpdate({
      content: [{ type: 'text', text: snapshot.visibleText || 'Working...' }],
      details: snapshot,
    });
  }
}

export function muteStdout(): void {
  writer = (msg) => process.stderr.write(`${msg}\n`);
}

export function getCurrentLogSink(): PiLogSink | undefined {
  return sinkStack[sinkStack.length - 1];
}

export async function withLogSink<T>(
  sink: PiLogSink | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  if (!sink) return fn();

  sinkStack.push(sink);
  try {
    return await fn();
  } finally {
    const current = sinkStack[sinkStack.length - 1];
    if (current === sink) {
      sinkStack.pop();
    } else {
      const index = sinkStack.lastIndexOf(sink);
      if (index !== -1) {
        sinkStack.splice(index, 1);
      }
    }
  }
}

export function createPiLogSink<TDetails>(
  onUpdate?: AgentToolUpdateCallback<TDetails>,
  options?: PiLogSinkOptions,
): PiLogSink {
  return new PiLogSink(
    onUpdate
      ? (update) => {
          (onUpdate as AgentToolUpdateCallback<PiLogDetails>)(update);
        }
      : undefined,
    options,
  );
}

export function log(msg: string): void {
  const sink = getCurrentLogSink();
  if (sink) {
    sink.appendLine(msg);
    return;
  }
  writer(msg);
}

export function createOnUpdateLogger<TDetails>(
  onUpdate: AgentToolUpdateCallback<TDetails>,
): (msg: string) => void {
  const sink = getCurrentLogSink() ?? createPiLogSink(onUpdate);
  return (msg: string) => {
    sink.appendLine(msg);
  };
}
