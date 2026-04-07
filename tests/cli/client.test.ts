import { EventEmitter } from 'node:events';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'node:child_process';
import {
  describeCliCommand,
  executeCliCommand,
  getCliCommandByName,
  getCliCommandsForCategories,
  listCliCommands,
  resetCliDiscoveryCache,
  resolveCliLaunchOptions,
} from '../../src/cli/client.js';

const mockSpawn = vi.mocked(spawn);
const tempDirs: string[] = [];
const processQueue: Array<EventEmitter & { stdout: PassThrough; stderr: PassThrough }> = [];

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function queueProcess(spec: { stdout?: string; stderr?: string; exitCode?: number }) {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const proc = new EventEmitter() as EventEmitter & {
    stdout: PassThrough;
    stderr: PassThrough;
  };
  proc.stdout = stdout;
  proc.stderr = stderr;

  setTimeout(() => {
    if (spec.stdout) stdout.write(spec.stdout);
    if (spec.stderr) stderr.write(spec.stderr);
    stdout.end();
    stderr.end();
    proc.emit('close', spec.exitCode ?? 0);
  }, 0);

  processQueue.push(proc);
  return proc;
}

function makeWorkspace(): string {
  const root = createTempDir('cluefin-');
  mkdirSync(join(root, 'apps', 'cluefin-openapi-cli'), { recursive: true });
  mkdirSync(join(root, 'apps', 'cluefin-ta-cli'), { recursive: true });
  writeFileSync(join(root, 'apps', 'cluefin-openapi-cli', 'pyproject.toml'), '[project]\nname="cluefin-openapi-cli"\n');
  writeFileSync(join(root, 'apps', 'cluefin-ta-cli', 'pyproject.toml'), '[project]\nname="cluefin-ta-cli"\n');
  return root;
}

describe('cli client', () => {
  beforeEach(() => {
    resetCliDiscoveryCache();
    delete process.env.CLUEFIN_CLI_CWD;
    processQueue.length = 0;
    mockSpawn.mockImplementation(() => {
      const next = processQueue.shift();
      if (!next) {
        throw new Error('No queued child process for spawn mock.');
      }
      return next as never;
    });
  });

  afterEach(() => {
    resetCliDiscoveryCache();
    vi.restoreAllMocks();
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('워크스페이스 루트에서 openapi CLI 실행 옵션을 계산한다', () => {
    const root = makeWorkspace();
    expect(resolveCliLaunchOptions('openapi', root)).toEqual({
      cwd: root,
      root,
      cmd: ['uv', 'run', 'cluefin-openapi-cli'],
    });
  });

  it('기본 sibling cluefin 경로를 사용한다', () => {
    const parent = createTempDir('workspace-');
    const dure = join(parent, 'cluefin-dure');
    const cluefin = join(parent, 'cluefin');
    mkdirSync(dure, { recursive: true });
    mkdirSync(join(cluefin, 'apps', 'cluefin-openapi-cli'), { recursive: true });
    mkdirSync(join(cluefin, 'apps', 'cluefin-ta-cli'), { recursive: true });
    writeFileSync(join(cluefin, 'apps', 'cluefin-openapi-cli', 'pyproject.toml'), '[project]\n');
    writeFileSync(join(cluefin, 'apps', 'cluefin-ta-cli', 'pyproject.toml'), '[project]\n');

    const previous = process.cwd();
    process.chdir(dure);
    try {
      expect(resolveCliLaunchOptions('ta')).toEqual({
        cwd: resolve(process.cwd(), '..', 'cluefin'),
        root: resolve(process.cwd(), '..', 'cluefin'),
        cmd: ['uv', 'run', 'cluefin-ta-cli'],
      });
    } finally {
      process.chdir(previous);
    }
  });

  it('CLI 앱을 찾지 못하면 명시적 에러를 던진다', () => {
    const root = createTempDir('cluefin-empty-');
    expect(() => resolveCliLaunchOptions('openapi', root)).toThrow(/CLUEFIN_CLI_CWD/);
  });

  it('list + describe 결과를 정규화하고 alias로 조회한다', async () => {
    const root = makeWorkspace();
    process.env.CLUEFIN_CLI_CWD = root;

    queueProcess({
      stdout: JSON.stringify({
        commands: [
          {
            broker: 'kis',
            category: 'stock',
            name: 'current-price',
            qualified_name: 'kis.stock.current-price',
            path_segments: ['kis', 'stock', 'current-price'],
            description: 'Get current price.',
            parameters: { type: 'object', properties: { stock_code: { type: 'string' } }, required: ['stock_code'] },
            returns: { type: 'object' },
            has_executor: true,
          },
        ],
      }),
    });
    queueProcess({ stdout: JSON.stringify({ commands: [] }) });
    queueProcess({
      stdout: JSON.stringify({
        command: {
          broker: 'kis',
          category: 'stock',
          name: 'current-price',
          qualified_name: 'kis.stock.current-price',
          path_segments: ['kis', 'stock', 'current-price'],
          description: 'Get current price.',
          parameters: { type: 'object', properties: { stock_code: { type: 'string' } }, required: ['stock_code'] },
          returns: { type: 'object' },
          has_executor: true,
        },
      }),
    });

    const commands = await listCliCommands('openapi');
    expect(commands).toHaveLength(1);
    expect(commands[0]?.qualifiedName).toBe('kis.stock.current-price');

    const command = await getCliCommandByName('kis_stock_current_price');
    expect(command?.alias).toBe('kis_stock_current_price');
  });

  it('카테고리별 discovery는 describe를 통해 상세 스키마를 가져온다', async () => {
    const root = makeWorkspace();
    process.env.CLUEFIN_CLI_CWD = root;

    queueProcess({
      stdout: JSON.stringify({ commands: [] }),
    });
    queueProcess({
      stdout: JSON.stringify({
        commands: [
          {
            broker: null,
            category: 'ta',
            name: 'sma',
            qualified_name: 'ta.sma',
            path_segments: ['ta', 'sma'],
            description: 'Simple Moving Average.',
            parameters: { type: 'object', properties: {} },
            returns: { type: 'object' },
            has_executor: true,
          },
        ],
      }),
    });
    queueProcess({
      stdout: JSON.stringify({
        command: {
          broker: null,
          category: 'ta',
          name: 'sma',
          qualified_name: 'ta.sma',
          path_segments: ['ta', 'sma'],
          description: 'Simple Moving Average.',
          parameters: {
            type: 'object',
            properties: { close: { type: 'array' }, timeperiod: { type: 'integer' } },
            required: ['close'],
          },
          returns: { type: 'object', properties: { values: { type: 'array' } } },
          has_executor: true,
        },
      }),
    });

    const commands = await getCliCommandsForCategories(['ta']);
    expect(commands[0]?.parameters).toEqual({
      type: 'object',
      properties: { close: { type: 'array' }, timeperiod: { type: 'integer' } },
      required: ['close'],
    });
  });

  it('필수 카테고리가 없으면 drift 에러를 던진다', async () => {
    const root = makeWorkspace();
    process.env.CLUEFIN_CLI_CWD = root;

    queueProcess({ stdout: JSON.stringify({ commands: [] }) });
    queueProcess({ stdout: JSON.stringify({ commands: [] }) });

    await expect(getCliCommandsForCategories(['stock'])).rejects.toThrow(/stock/);
  });

  it('scalar와 params-json을 섞어 CLI를 실행한다', async () => {
    const root = makeWorkspace();
    process.env.CLUEFIN_CLI_CWD = root;

    queueProcess({
      stdout: JSON.stringify({ value: 123 }),
    });

    const result = await executeCliCommand(
      {
        app: 'ta',
        broker: null,
        category: 'ta',
        name: 'sma',
        qualifiedName: 'ta.sma',
        pathSegments: ['ta', 'sma'],
        description: 'Simple Moving Average.',
        hasExecutor: true,
        alias: 'ta_sma',
        parameters: {
          type: 'object',
          properties: {
            close: { type: 'array' },
            timeperiod: { type: 'integer' },
          },
          required: ['close'],
        },
        returns: { type: 'object' },
      },
      { close: [1, 2, 3], timeperiod: 5 },
    );

    expect(result).toEqual({ value: 123 });
    expect(mockSpawn).toHaveBeenCalledWith(
      'uv',
      expect.arrayContaining([
        'run',
        'cluefin-ta-cli',
        'ta',
        'sma',
        '--params-json',
        '{"close":[1,2,3]}',
        '--timeperiod',
        '5',
        '--json',
      ]),
      expect.objectContaining({ cwd: root }),
    );
  });

  it('CLI non-zero exit를 에러로 올린다', async () => {
    const root = makeWorkspace();
    process.env.CLUEFIN_CLI_CWD = root;

    queueProcess({
      stderr: 'boom',
      exitCode: 2,
    });

    await expect(
      describeCliCommand('ta', ['ta', 'sma']),
    ).rejects.toThrow(/exit=2/);
  });

  it('stdout JSON이 깨지면 파싱 에러를 올린다', async () => {
    const root = makeWorkspace();
    process.env.CLUEFIN_CLI_CWD = root;

    queueProcess({
      stdout: 'not-json',
    });

    await expect(describeCliCommand('ta', ['ta', 'sma'])).rejects.toThrow(/JSON 파싱/);
  });
});
