import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JsonRpcRemoteError } from '../../src/rpc/jsonrpc.js';
import { StdioJsonRpcClient } from '../../src/rpc/stdio-jsonrpc-client.js';
import { createPiLogSink, withLogSink } from '../../src/runtime/log.js';

// spawn 모킹
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'node:child_process';
const mockSpawn = vi.mocked(spawn);

function createMockProcess() {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const proc = new EventEmitter() as EventEmitter & {
    stdin: PassThrough;
    stdout: PassThrough;
    stderr: PassThrough;
    kill: ReturnType<typeof vi.fn>;
    pid: number;
  };
  proc.stdin = stdin;
  proc.stdout = stdout;
  proc.stderr = stderr;
  proc.kill = vi.fn();
  proc.pid = 12345;
  return proc;
}

describe('StdioJsonRpcClient', () => {
  let client: StdioJsonRpcClient;
  let mockProc: ReturnType<typeof createMockProcess>;

  beforeEach(() => {
    mockProc = createMockProcess();
    mockSpawn.mockReturnValue(mockProc as never);
    client = new StdioJsonRpcClient({
      cmd: ['uv', 'run', '-m', 'cluefin_rpc'],
      cwd: '/test',
      defaultTimeoutMs: 1000,
    });
  });

  afterEach(() => {
    // stdout를 닫아 readStdoutLoop가 종료되도록 함
    mockProc.stdout.destroy();
    mockProc.stderr.destroy();
    vi.restoreAllMocks();
  });

  describe('start()', () => {
    it('spawn 호출 인자 검증', () => {
      client.start();
      expect(mockSpawn).toHaveBeenCalledWith('uv', ['run', '-m', 'cluefin_rpc'], {
        cwd: '/test',
        env: expect.objectContaining({}),
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    });

    it('이미 시작된 경우 무시', () => {
      mockSpawn.mockClear();
      client.start();
      client.start();
      expect(mockSpawn).toHaveBeenCalledTimes(1);
    });
  });

  describe('request() 성공', () => {
    it('stdin에 JSON-RPC 요청 기록, stdout에서 응답 수신', async () => {
      client.start();

      const chunks: Buffer[] = [];
      mockProc.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));

      const resultPromise = client.request('stock.current_price', { ticker: '005930' });

      // stdin에 기록된 요청 확인
      await new Promise((r) => setTimeout(r, 10));
      const written = Buffer.concat(chunks).toString();
      const request = JSON.parse(written.trim());
      expect(request.method).toBe('stock.current_price');
      expect(request.params).toEqual({ ticker: '005930' });
      expect(request.id).toBe(1);

      // stdout으로 응답 전송
      mockProc.stdout.write(
        `${JSON.stringify({ jsonrpc: '2.0', id: 1, result: { price: 70000 } })}\n`,
      );

      const result = await resultPromise;
      expect(result).toEqual({ price: 70000 });
    });
  });

  describe('request() 에러', () => {
    it('RPC 에러 응답 시 JsonRpcRemoteError 발생', async () => {
      client.start();

      const resultPromise = client.request('bad.method');

      mockProc.stdout.write(
        `${JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          error: { code: -32601, message: 'Method not found', data: null },
        })}\n`,
      );

      await expect(resultPromise).rejects.toThrow(JsonRpcRemoteError);
      await expect(resultPromise).rejects.toMatchObject({
        code: -32601,
        message: 'Method not found',
      });
    });
  });

  describe('request() 타임아웃', () => {
    it('응답 없을 때 타임아웃 reject', async () => {
      client = new StdioJsonRpcClient({
        cmd: ['uv', 'run'],
        defaultTimeoutMs: 50,
      });
      mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc as never);
      client.start();

      await expect(client.request('slow.method')).rejects.toThrow(/timeout/i);
    });
  });

  describe('프로세스 조기 종료', () => {
    it('응답 전에 exit되면 timeout 대신 종료 에러를 반환한다', async () => {
      client.start();

      const resultPromise = client.request('rpc.list_methods');
      mockProc.stderr.write('No module named cluefin_rpc\n');
      mockProc.emit('exit', 1, null);

      await expect(resultPromise).rejects.toThrow(/exited before responding/);
    });
  });

  describe('close()', () => {
    it('rpc.shutdown 알림 + kill 호출', async () => {
      client.start();

      const chunks: Buffer[] = [];
      mockProc.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));

      // kill 호출 시 stdout을 닫아 stdoutLoop가 종료되도록 시뮬레이션
      mockProc.kill.mockImplementation(() => {
        mockProc.stdout.push(null); // EOF
        mockProc.stderr.push(null); // EOF
      });

      await client.close();

      const written = Buffer.concat(chunks).toString();
      expect(written).toContain('rpc.shutdown');
      expect(mockProc.kill).toHaveBeenCalled();
    });
  });

  describe('동시 요청', () => {
    it('서로 다른 id로 올바르게 resolve', async () => {
      client.start();

      const p1 = client.request('method.a');
      const p2 = client.request('method.b');

      // id=2 먼저 응답
      mockProc.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, result: 'b' })}\n`);
      mockProc.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, result: 'a' })}\n`);

      expect(await p1).toBe('a');
      expect(await p2).toBe('b');
    });
  });

  describe('stderr capture', () => {
    it('stderr를 line-buffering하여 sink로 전달하고 마지막 chunk도 flush', async () => {
      const updates: Array<{ details: { logs: string } }> = [];
      const sink = createPiLogSink((update) => updates.push(update as never), {
        flushIntervalMs: 1,
      });

      await withLogSink(sink, async () => {
        client.start();
        mockProc.stderr.write('first');
        mockProc.stderr.write(' second\nthird');
        mockProc.stderr.end();
        await new Promise((resolve) => setTimeout(resolve, 10));
        sink.flush();
      });

      expect(updates.at(-1)?.details.logs).toContain('[rpc] first second\n');
      expect(updates.at(-1)?.details.logs).toContain('[rpc] third\n');
    });
  });

  describe('시작 전 요청', () => {
    it('프로세스 미시작 시 에러', async () => {
      await expect(client.request('test')).rejects.toThrow('JSON-RPC process is not started');
    });
  });
});
