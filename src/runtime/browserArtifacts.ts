import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type BrowserArtifactScope = 'generic' | 'news';
export type BrowserArtifactKind = 'text' | 'binary';

export interface BrowserArtifactMetadata {
  path: string;
  relativePath: string;
  kind: BrowserArtifactKind;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  sourceUrl?: string;
  label?: string;
}

export interface SaveBrowserArtifactInput {
  runId: string;
  scope: BrowserArtifactScope;
  ticker?: string;
  fileName: string;
  contentType: string;
  sourceUrl?: string;
  label?: string;
}

export interface SaveBrowserTextArtifactInput extends SaveBrowserArtifactInput {
  text: string;
}

export interface SaveBrowserBinaryArtifactInput extends SaveBrowserArtifactInput {
  bytes: Uint8Array;
}

export interface PlannedBrowserArtifactFile {
  path: string;
  relativePath: string;
}

const DATA_RUNS_DIR = path.resolve('data/runs');

export async function saveBrowserTextArtifact(
  input: SaveBrowserTextArtifactInput,
): Promise<BrowserArtifactMetadata> {
  const filePath = resolveScopedBrowserArtifactPath(input);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, input.text, 'utf-8');
  return writeMetadata(input, filePath, Buffer.byteLength(input.text, 'utf-8'), 'text');
}

export async function saveBrowserBinaryArtifact(
  input: SaveBrowserBinaryArtifactInput,
): Promise<BrowserArtifactMetadata> {
  const filePath = resolveScopedBrowserArtifactPath(input);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, input.bytes);
  return writeMetadata(input, filePath, input.bytes.byteLength, 'binary');
}

export async function planBrowserArtifactFile(
  input: SaveBrowserArtifactInput,
): Promise<PlannedBrowserArtifactFile> {
  const filePath = resolveScopedBrowserArtifactPath(input);
  await mkdir(path.dirname(filePath), { recursive: true });
  return {
    path: filePath,
    relativePath: path.relative(DATA_RUNS_DIR, filePath),
  };
}

export async function recordBrowserArtifactFile(
  input: SaveBrowserArtifactInput,
): Promise<BrowserArtifactMetadata> {
  const filePath = resolveScopedBrowserArtifactPath(input);
  const fileStat = await stat(filePath);
  const kind =
    input.contentType.startsWith('text/') || input.contentType === 'application/json'
      ? 'text'
      : 'binary';
  return writeMetadata(input, filePath, fileStat.size, kind);
}

export async function readBrowserArtifactMetadata(
  artifactPath: string,
): Promise<BrowserArtifactMetadata> {
  const raw = await readFile(metadataPathFor(artifactPath), 'utf-8');
  return JSON.parse(raw) as BrowserArtifactMetadata;
}

export function resolveScopedBrowserArtifactPath(input: SaveBrowserArtifactInput): string {
  const fileName = safeBrowserPathSegment(input.fileName);
  const ticker = input.ticker ? safeBrowserPathSegment(input.ticker) : undefined;
  const segments = scopedSegments(input.scope, ticker, fileName);
  return resolveBrowserArtifactPath(input.runId, segments);
}

export function resolveBrowserArtifactPath(runId: string, segments: string[]): string {
  const runRoot = browserRunRoot(runId);
  const artifactPath = path.resolve(runRoot, ...segments);
  assertPathInside(runRoot, artifactPath);
  return artifactPath;
}

export function browserRunRoot(runId: string): string {
  return path.join(DATA_RUNS_DIR, safeBrowserPathSegment(runId));
}

export function safeBrowserPathSegment(value: string): string {
  if (value.includes('/') || value.includes('\\')) {
    throw new Error(`Invalid browser artifact path segment: ${value}`);
  }
  const safe = value
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!safe || safe === '.' || safe === '..') {
    throw new Error(`Invalid browser artifact path segment: ${value}`);
  }
  return safe;
}

function scopedSegments(
  scope: BrowserArtifactScope,
  ticker: string | undefined,
  fileName: string,
): string[] {
  if (scope === 'news') {
    return ['news', ticker ?? 'unknown', 'browser', fileName];
  }
  return ['browser-artifacts', fileName];
}

async function writeMetadata(
  input: SaveBrowserArtifactInput,
  filePath: string,
  sizeBytes: number,
  kind: BrowserArtifactKind,
): Promise<BrowserArtifactMetadata> {
  const relativePath = path.relative(DATA_RUNS_DIR, filePath);
  const metadata: BrowserArtifactMetadata = {
    path: filePath,
    relativePath,
    kind,
    contentType: input.contentType,
    sizeBytes,
    createdAt: new Date().toISOString(),
    sourceUrl: input.sourceUrl,
    label: input.label,
  };
  await writeFile(metadataPathFor(filePath), JSON.stringify(metadata, null, 2), 'utf-8');
  return metadata;
}

function metadataPathFor(filePath: string): string {
  return `${filePath}.metadata.json`;
}

function assertPathInside(root: string, target: string): void {
  const relative = path.relative(root, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Browser artifact path escapes run directory: ${target}`);
  }
}
