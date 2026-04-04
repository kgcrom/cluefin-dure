import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveRpcLaunchOptions } from '../../src/rpc/rpc-client.js';

const tempDirs: string[] = [];

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

describe('resolveRpcLaunchOptions', () => {
  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it('cluefin 워크스페이스 루트면 apps/cluefin-rpc 프로젝트로 실행한다', () => {
    const root = createTempDir('cluefin-root-');
    mkdirSync(join(root, 'apps', 'cluefin-rpc', 'src', 'cluefin_rpc'), { recursive: true });
    writeFileSync(join(root, 'apps', 'cluefin-rpc', 'pyproject.toml'), '[project]\nname="cluefin-rpc"\n');
    writeFileSync(join(root, 'apps', 'cluefin-rpc', 'src', 'cluefin_rpc', '__main__.py'), '');

    expect(resolveRpcLaunchOptions(root)).toEqual({
      cwd: root,
      cmd: ['uv', 'run', '--project', 'apps/cluefin-rpc', '-m', 'cluefin_rpc'],
    });
  });

  it('apps/cluefin-rpc 디렉터리면 모듈 직접 실행한다', () => {
    const project = createTempDir('cluefin-rpc-');
    mkdirSync(join(project, 'src', 'cluefin_rpc'), { recursive: true });
    writeFileSync(join(project, 'pyproject.toml'), '[project]\nname="cluefin-rpc"\n');
    writeFileSync(join(project, 'src', 'cluefin_rpc', '__main__.py'), '');

    expect(resolveRpcLaunchOptions(project)).toEqual({
      cwd: project,
      cmd: ['uv', 'run', '-m', 'cluefin_rpc'],
    });
  });

  it('RPC 프로젝트를 찾지 못하면 명시적 에러를 던진다', () => {
    const empty = createTempDir('cluefin-empty-');
    expect(() => resolveRpcLaunchOptions(empty)).toThrow(/CLUEFIN_RPC_CWD/);
  });
});
