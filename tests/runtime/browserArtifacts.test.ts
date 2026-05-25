import { mkdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalCwd = process.cwd();
let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `browser-artifacts-test-${Date.now()}-${Math.random()}`);
  await mkdir(tmpDir, { recursive: true });
  process.chdir(tmpDir);
  vi.resetModules();
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('browser artifact helpers', () => {
  it('keeps artifact paths inside the run directory', async () => {
    const { resolveBrowserArtifactPath, resolveScopedBrowserArtifactPath } = await import(
      '../../src/runtime/browserArtifacts.js'
    );

    const newsPath = resolveScopedBrowserArtifactPath({
      runId: 'run-1',
      scope: 'news',
      ticker: '005930',
      fileName: 'naver-news.json',
      contentType: 'application/json',
    });
    expect(newsPath).toBe(path.resolve('data/runs/run-1/news/005930/browser/naver-news.json'));
    expect(() => resolveBrowserArtifactPath('run-1', ['..', 'escape.json'])).toThrow(
      /escapes run directory/,
    );
  });

  it('writes and reads text artifact metadata', async () => {
    const { readBrowserArtifactMetadata, saveBrowserTextArtifact } = await import(
      '../../src/runtime/browserArtifacts.js'
    );

    const metadata = await saveBrowserTextArtifact({
      runId: 'run-2',
      scope: 'news',
      ticker: '000660',
      fileName: 'flashnews.json',
      contentType: 'application/json',
      sourceUrl: 'https://stock.naver.com/news/flashnews',
      label: 'flashnews',
      text: JSON.stringify({ articles: [{ title: 'HBM' }] }),
    });

    expect(metadata).toMatchObject({
      relativePath: 'run-2/news/000660/browser/flashnews.json',
      kind: 'text',
      contentType: 'application/json',
      sourceUrl: 'https://stock.naver.com/news/flashnews',
      label: 'flashnews',
    });
    await expect(readFile(metadata.path, 'utf-8')).resolves.toContain('HBM');
    await expect(readBrowserArtifactMetadata(metadata.path)).resolves.toMatchObject({
      path: metadata.path,
      sizeBytes: metadata.sizeBytes,
    });
  });

  it('does not change existing ArtifactStore JSON behavior', async () => {
    const { ArtifactStore } = await import('../../src/runtime/artifactStore.js');
    const store = new ArtifactStore();

    await store.put('run-4', 'news', '005930', { ticker: '005930', catalysts: ['HBM'] });

    await expect(store.get('run-4', 'news', '005930')).resolves.toEqual({
      ticker: '005930',
      catalysts: ['HBM'],
    });
    await expect(readFile('data/runs/run-4/news/005930.json', 'utf-8')).resolves.toContain('HBM');
  });
});
