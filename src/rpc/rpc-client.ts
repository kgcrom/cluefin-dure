import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { log } from '../runtime/log.js';
import { StdioJsonRpcClient } from './stdio-jsonrpc-client.js';
import { ToolRegistry } from './tool-registry.js';

export type RpcContext = {
  client: StdioJsonRpcClient;
  registry: ToolRegistry;
  initializedBrokers: Set<string>;
};

let context: RpcContext | null = null;
let initPromise: Promise<RpcContext> | null = null;

function getRpcCwd(): string {
  const cwd = process.env.CLUEFIN_RPC_CWD;
  if (!cwd) {
    throw new Error(
      'CLUEFIN_RPC_CWD 환경변수가 설정되지 않았습니다. cluefin 리포 경로를 지정해주세요.',
    );
  }
  return cwd;
}

export function resolveRpcLaunchOptions(configuredCwd = getRpcCwd()): {
  cwd: string;
  cmd: string[];
} {
  const cwd = resolve(configuredCwd);
  const workspaceRpcDir = join(cwd, 'apps', 'cluefin-rpc');
  const workspaceRpcEntry = join(workspaceRpcDir, 'src', 'cluefin_rpc', '__main__.py');
  if (existsSync(join(workspaceRpcDir, 'pyproject.toml')) && existsSync(workspaceRpcEntry)) {
    return {
      cwd,
      cmd: ['uv', 'run', '--project', 'apps/cluefin-rpc', '-m', 'cluefin_rpc'],
    };
  }

  const packageRpcEntry = join(cwd, 'src', 'cluefin_rpc', '__main__.py');
  if (existsSync(join(cwd, 'pyproject.toml')) && existsSync(packageRpcEntry)) {
    return {
      cwd,
      cmd: ['uv', 'run', '-m', 'cluefin_rpc'],
    };
  }

  throw new Error(
    [
      `CLUEFIN_RPC_CWD='${configuredCwd}' 경로에서 cluefin RPC 프로젝트를 찾지 못했습니다.`,
      'cluefin 워크스페이스 루트 또는 apps/cluefin-rpc 디렉터리를 지정해주세요.',
    ].join(' '),
  );
}

async function init(): Promise<RpcContext> {
  const rpc = resolveRpcLaunchOptions();
  const client = new StdioJsonRpcClient({
    cmd: rpc.cmd,
    cwd: rpc.cwd,
    defaultTimeoutMs: 30_000,
  });

  log(`[rpc] starting subprocess: ${rpc.cmd.join(' ')} (cwd=${rpc.cwd})`);
  client.start();
  log('[rpc] cluefin_rpc subprocess started');

  const registry = new ToolRegistry(client);
  await registry.discover();
  log(`[rpc] registry discovered, categories: ${registry.getCategories().join(', ')}`);

  const ctx: RpcContext = {
    client,
    registry,
    initializedBrokers: new Set<string>(),
  };

  context = ctx;
  return ctx;
}

/** Lazy-initialize and return the singleton RPC context. */
export function getRpcContext(): Promise<RpcContext> {
  if (context) return Promise.resolve(context);
  if (!initPromise) {
    initPromise = init().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

/** Shut down the RPC subprocess. */
export async function closeRpcClient(): Promise<void> {
  if (context) {
    await context.client.close();
    context = null;
    initPromise = null;
    log('[rpc] cluefin_rpc subprocess closed');
  }
}
