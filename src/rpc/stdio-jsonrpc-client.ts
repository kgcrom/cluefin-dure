import { type ChildProcessByStdio, spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import { setTimeout as sleep } from 'node:timers/promises';
import { log } from '../runtime/log.js';
import {
  createRequest,
  type JsonRpcId,
  JsonRpcRemoteError,
  type JsonRpcResponse,
  parseMessageLine,
  serializeMessage,
} from './jsonrpc.js';

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

type StdioJsonRpcClientOptions = {
  cmd: string[];
  cwd?: string;
  env?: Record<string, string | undefined>;
  defaultTimeoutMs?: number;
};

function isResponse(message: unknown): message is JsonRpcResponse {
  if (!message || typeof message !== 'object') return false;
  const record = message as Record<string, unknown>;
  return 'id' in record && ('result' in record || 'error' in record);
}

export class StdioJsonRpcClient {
  private readonly options: StdioJsonRpcClientOptions;
  private process: ChildProcessByStdio<Writable, Readable, Readable> | null = null;
  private pending = new Map<JsonRpcId, PendingRequest>();
  private nextId = 1;
  private stdoutLoop: Promise<void> | null = null;
  private stderrLoop: Promise<void> | null = null;
  private isClosing = false;
  private stderrLines: string[] = [];
  private stderrRaw = '';

  constructor(options: StdioJsonRpcClientOptions) {
    this.options = {
      defaultTimeoutMs: 30_000,
      ...options,
    };
  }

  start(): void {
    if (this.process) return;

    const [command, ...args] = this.options.cmd;
    if (!command) {
      throw new Error('JSON-RPC command is required');
    }

    this.process = spawn(command, args, {
      cwd: this.options.cwd,
      env: { ...process.env, ...this.options.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.isClosing = false;
    this.stderrLines = [];
    this.stderrRaw = '';

    this.process.on('error', (error) => {
      this.rejectAll(
        error instanceof Error ? error : new Error('Failed to spawn JSON-RPC process'),
      );
    });
    this.process.on('exit', (code, signal) => {
      if (this.isClosing) return;
      this.rejectAll(new Error(this.formatProcessExitMessage(code, signal)));
    });

    this.stdoutLoop = this.readStdoutLoop();
    this.stderrLoop = this.readStderrLoop();
  }

  async close(): Promise<void> {
    if (!this.process) return;

    this.isClosing = true;
    this.notify('rpc.shutdown');
    await sleep(100);

    this.process.kill();
    await this.stdoutLoop;
    await this.stderrLoop;
    this.rejectAll(new Error('JSON-RPC process closed'));
    this.process = null;
    this.stdoutLoop = null;
    this.stderrLoop = null;
  }

  async request<T>(method: string, params?: unknown, timeoutMs?: number): Promise<T> {
    if (!this.process) {
      throw new Error('JSON-RPC process is not started');
    }

    const id = this.nextId++;
    const message = createRequest(id, method, params);

    const promise = new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`JSON-RPC timeout for method '${method}'`));
      }, timeoutMs ?? this.options.defaultTimeoutMs);

      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timeout,
      });
    });

    this.process.stdin.write(serializeMessage(message), 'utf8');
    return promise;
  }

  notify(method: string, params?: unknown): void {
    if (!this.process) {
      throw new Error('JSON-RPC process is not started');
    }

    this.process.stdin.write(serializeMessage({ jsonrpc: '2.0', method, params }), 'utf8');
  }

  private async readStdoutLoop(): Promise<void> {
    if (!this.process) return;

    const lineReader = createInterface({
      input: this.process.stdout,
      crlfDelay: Number.POSITIVE_INFINITY,
    });

    try {
      for await (const rawLine of lineReader) {
        const line = rawLine.trim();
        if (line.length > 0) {
          this.handleLine(line);
        }
      }
    } catch (error) {
      this.rejectAll(error instanceof Error ? error : new Error('Failed to read JSON-RPC stream'));
    } finally {
      lineReader.close();
    }
  }

  private async readStderrLoop(): Promise<void> {
    if (!this.process?.stderr) return;

    let buffer = '';

    try {
      for await (const chunk of this.process.stderr) {
        const text = chunk.toString('utf8').replaceAll('\r\n', '\n');
        this.pushStderrRaw(text);
        buffer += text;
        let newlineIndex = buffer.indexOf('\n');
        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex).trimEnd();
          if (line.length > 0) {
            this.pushStderrLine(line);
            log(`[rpc] ${line}`);
          }
          buffer = buffer.slice(newlineIndex + 1);
          newlineIndex = buffer.indexOf('\n');
        }
      }

      if (buffer.trim().length > 0) {
        const line = buffer.trimEnd();
        this.pushStderrLine(line);
        log(`[rpc] ${line}`);
      }
    } catch (error) {
      this.rejectAll(error instanceof Error ? error : new Error('Failed to read stderr stream'));
    }
  }

  private handleLine(line: string): void {
    let message: unknown;

    try {
      message = parseMessageLine(line);
    } catch (error) {
      this.rejectAll(error instanceof Error ? error : new Error('Invalid JSON-RPC message'));
      return;
    }

    if (!isResponse(message)) return;

    const pending = this.pending.get(message.id);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pending.delete(message.id);

    if ('error' in message) {
      pending.reject(
        new JsonRpcRemoteError(message.error.code, message.error.message, message.error.data),
      );
      return;
    }

    pending.resolve(message.result);
  }

  private rejectAll(error: Error): void {
    for (const [id, pending] of this.pending.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
      this.pending.delete(id);
    }
  }

  private pushStderrLine(line: string): void {
    this.stderrLines.push(line);
    if (this.stderrLines.length > 20) {
      this.stderrLines.shift();
    }
  }

  private pushStderrRaw(text: string): void {
    this.stderrRaw += text;
    if (this.stderrRaw.length > 4000) {
      this.stderrRaw = this.stderrRaw.slice(-4000);
    }
  }

  private formatProcessExitMessage(code: number | null, signal: NodeJS.Signals | null): string {
    const exitReason =
      code !== null ? `code ${code}` : signal ? `signal ${signal}` : 'unknown reason';
    const stderr = [this.stderrLines.join('\n').trim(), this.stderrRaw.trim()]
      .filter((value, index, values) => value.length > 0 && values.indexOf(value) === index)
      .join('\n')
      .trim();
    return stderr.length > 0
      ? `JSON-RPC process exited before responding (${exitReason})\n${stderr}`
      : `JSON-RPC process exited before responding (${exitReason})`;
  }
}
