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

async function init(): Promise<RpcContext> {
  const client = new StdioJsonRpcClient({
    cmd: ['uv', 'run', '-m', 'cluefin_rpc'],
    cwd: getRpcCwd(),
    defaultTimeoutMs: 30_000,
  });

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
