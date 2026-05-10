import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalCwd = process.cwd();
let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `artifact-store-test-${Date.now()}-${Math.random()}`);
  await mkdir(tmpDir, { recursive: true });
  process.chdir(tmpDir);
  vi.resetModules();
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('ArtifactStore', () => {
  it('put은 캐시와 data/runs JSON 파일을 함께 갱신한다', async () => {
    const { ArtifactStore } = await import('../../src/runtime/artifactStore.js');
    const store = new ArtifactStore();
    const artifact = { ticker: '005930', memo: 'quality compounder' };

    await store.put('run-1', 'fundamental', '005930', artifact);

    await expect(store.get('run-1', 'fundamental', '005930')).resolves.toEqual(artifact);
    await expect(readJson('data/runs/run-1/fundamental/005930.json')).resolves.toEqual(artifact);
  });

  it('get은 캐시가 없으면 디스크에서 읽고 이후 캐시된 값을 반환한다', async () => {
    const { ArtifactStore } = await import('../../src/runtime/artifactStore.js');
    const store = new ArtifactStore();
    const filePath = 'data/runs/run-2/news/005930.json';
    await writeJson(filePath, { ticker: '005930', catalysts: ['HBM'] });

    await expect(store.get('run-2', 'news', '005930')).resolves.toEqual({
      ticker: '005930',
      catalysts: ['HBM'],
    });

    await writeFile(filePath, JSON.stringify({ ticker: '005930', catalysts: ['changed'] }));
    await expect(store.get('run-2', 'news', '005930')).resolves.toEqual({
      ticker: '005930',
      catalysts: ['HBM'],
    });
  });

  it('없는 artifact와 손상된 JSON은 undefined로 반환한다', async () => {
    const { ArtifactStore } = await import('../../src/runtime/artifactStore.js');
    const store = new ArtifactStore();
    await mkdir('data/runs/run-3/critic', { recursive: true });
    await writeFile('data/runs/run-3/critic/output.json', '{broken', 'utf-8');

    await expect(store.get('run-3', 'strategy', 'output')).resolves.toBeUndefined();
    await expect(store.get('run-3', 'critic', 'output')).resolves.toBeUndefined();
  });

  it('getRunArtifacts는 해당 run의 캐시 항목만 반환한다', async () => {
    const { ArtifactStore } = await import('../../src/runtime/artifactStore.js');
    const store = new ArtifactStore();

    await store.put('run-4', 'strategy', 'output', { name: 'Quality' });
    await store.put('other-run', 'strategy', 'output', { name: 'Other' });

    const artifacts = await store.getRunArtifacts('run-4');

    expect([...artifacts.keys()]).toEqual(['run-4/strategy/output']);
    expect(artifacts.get('run-4/strategy/output')).toEqual({ name: 'Quality' });
  });
});

async function writeJson(relativePath: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(relativePath), { recursive: true });
  await writeFile(relativePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function readJson(relativePath: string): Promise<unknown> {
  return JSON.parse(await readFile(relativePath, 'utf-8'));
}
