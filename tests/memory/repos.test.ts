import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoredStrategy } from '../../src/memory/strategyRepo.js';
import type { Thesis } from '../../src/memory/thesisRepo.js';
import type { ExperimentRecord } from '../../src/schemas/signal.js';

const originalCwd = process.cwd();
let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `repo-test-${Date.now()}-${Math.random()}`);
  await mkdir(tmpDir, { recursive: true });
  process.chdir(tmpDir);
  vi.resetModules();
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('StrategyRepo', () => {
  it('파일이 없으면 빈 목록으로 시작하고 add 결과를 디스크에 저장한다', async () => {
    const { StrategyRepo } = await import('../../src/memory/strategyRepo.js');
    const repo = new StrategyRepo();
    const record = strategyRecord('strategy-1');

    expect(await repo.list()).toEqual([]);

    await repo.add(record);

    expect(await repo.get('strategy-1')).toEqual(record);
    await expect(readJson('data/processed/strategies.json')).resolves.toEqual([record]);
  });

  it('기존 JSON을 로드하고 update는 updatedAt을 새로 기록한다', async () => {
    const existing = strategyRecord('strategy-1', '2026-01-01T00:00:00.000Z');
    await writeJson('data/processed/strategies.json', [existing]);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-03T04:05:06.000Z'));

    const { StrategyRepo } = await import('../../src/memory/strategyRepo.js');
    const repo = new StrategyRepo();

    await repo.update('strategy-1', { iterationCount: 3, lastCriticVerdict: 'keep' });

    expect(await repo.get('strategy-1')).toMatchObject({
      id: 'strategy-1',
      iterationCount: 3,
      lastCriticVerdict: 'keep',
      updatedAt: '2026-02-03T04:05:06.000Z',
    });
    await expect(readJson('data/processed/strategies.json')).resolves.toMatchObject([
      { id: 'strategy-1', iterationCount: 3 },
    ]);
  });

  it('없는 id update는 파일을 다시 쓰지 않는다', async () => {
    const existing = strategyRecord('strategy-1');
    await writeJson('data/processed/strategies.json', [existing]);
    const { StrategyRepo } = await import('../../src/memory/strategyRepo.js');
    const repo = new StrategyRepo();

    await repo.update('missing', { iterationCount: 9 });

    expect(await repo.list()).toEqual([existing]);
    await expect(readJson('data/processed/strategies.json')).resolves.toEqual([existing]);
  });
});

describe('ThesisRepo', () => {
  it('thesis를 저장하고 status 업데이트 시 updatedAt을 갱신한다', async () => {
    const { ThesisRepo } = await import('../../src/memory/thesisRepo.js');
    const repo = new ThesisRepo();
    const thesis = thesisRecord('thesis-1', 'active', '2026-01-01T00:00:00.000Z');

    await repo.add(thesis);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-03T04:05:06.000Z'));
    await repo.update('thesis-1', { status: 'confirmed', evidence: ['filing', 'call'] });

    expect(await repo.get('thesis-1')).toMatchObject({
      id: 'thesis-1',
      status: 'confirmed',
      evidence: ['filing', 'call'],
      updatedAt: '2026-02-03T04:05:06.000Z',
    });
    await expect(readJson('data/processed/theses.json')).resolves.toMatchObject([
      { id: 'thesis-1', status: 'confirmed' },
    ]);
  });
});

describe('ExperimentRepo', () => {
  it('실험 기록을 저장하고 결과 patch를 병합한다', async () => {
    const { ExperimentRepo } = await import('../../src/memory/experimentRepo.js');
    const repo = new ExperimentRepo();
    const experiment = experimentRecord('experiment-1');

    await repo.add(experiment);
    await repo.update('experiment-1', {
      criticVerdict: 'keep',
      result: { sharpe: 1.3, maxDrawdown: -0.08 },
    });

    expect(await repo.get('experiment-1')).toMatchObject({
      id: 'experiment-1',
      criticVerdict: 'keep',
      result: { sharpe: 1.3, maxDrawdown: -0.08 },
    });
    await expect(readJson('data/processed/experiments.json')).resolves.toMatchObject([
      { id: 'experiment-1', criticVerdict: 'keep' },
    ]);
  });

  it('손상된 JSON은 빈 저장소처럼 처리한다', async () => {
    await mkdir('data/processed', { recursive: true });
    await writeFile('data/processed/experiments.json', '{broken json', 'utf-8');

    const { ExperimentRepo } = await import('../../src/memory/experimentRepo.js');
    const repo = new ExperimentRepo();

    expect(await repo.list()).toEqual([]);
  });
});

async function writeJson(relativePath: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(relativePath), { recursive: true });
  await writeFile(relativePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function readJson(relativePath: string): Promise<unknown> {
  return JSON.parse(await readFile(relativePath, 'utf-8'));
}

function strategyRecord(id: string, updatedAt = '2026-01-02T00:00:00.000Z'): StoredStrategy {
  return {
    id,
    strategy: {
      name: 'Quality Growth',
      hypothesis: 'High quality companies compound through cycles.',
      entryRules: ['Buy when ROE is stable.'],
      exitRules: ['Sell when debt rises sharply.'],
      positionSizing: 'Equal weight',
      rebalancePeriod: 'Quarterly',
      config: { minRoe: 15 },
    },
    lastCriticVerdict: 'revise',
    iterationCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt,
  };
}

function thesisRecord(id: string, status: Thesis['status'], updatedAt: string): Thesis {
  return {
    id,
    ticker: '005930',
    hypothesis: 'HBM demand supports margins.',
    evidence: ['customer order'],
    status,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt,
  };
}

function experimentRecord(id: string): ExperimentRecord {
  return {
    id,
    strategyId: 'strategy-1',
    params: { lookback: 12 },
    result: { sharpe: 0.8 },
    criticVerdict: 'revise',
    timestamp: '2026-01-01T00:00:00.000Z',
  };
}
