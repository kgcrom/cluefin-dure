import type { AgentToolResult, ToolDefinition } from '@mariozechner/pi-coding-agent';
import { Type } from '@sinclair/typebox';
import { CATEGORY_DESCRIPTIONS } from './category-descriptions.js';
import { JsonRpcRemoteError } from './jsonrpc.js';
import { getRpcContext } from './rpc-client.js';

/** 에이전트별 사용 가능한 RPC 카테고리 매핑 */
const AGENT_CATEGORIES: Record<string, string[]> = {
  universe: ['ranking', 'stock', 'sector', 'theme', 'market', 'etf'],
  fundamental: ['financial', 'stock', 'dart', 'schedule'],
  news: ['dart'],
  strategy: ['stock', 'chart', 'ta', 'financial'],
  backtest: ['chart', 'ta'],
  critic: [],
  router: [],
};

/**
 * 에이전트에 할당된 RPC 카테고리의 메서드들을 ToolDefinition[]으로 반환.
 * RPC 서버에서 메서드 목록을 가져와 동적으로 도구를 생성한다.
 */
export async function getToolsForAgent(agentName: string): Promise<ToolDefinition[]> {
  const categories = AGENT_CATEGORIES[agentName];
  if (!categories || categories.length === 0) return [];

  const { registry, initializedBrokers } = await getRpcContext();

  const methods = [];
  for (const category of categories) {
    const fetched = await registry.fetchMethodsByCategory(category);
    methods.push(...fetched);
  }

  return registry.toPiTools({ methods, initializedBrokers });
}

/**
 * 카테고리 외 메서드 호출용 fallback 도구.
 * 에이전트가 할당된 카테고리에 없는 RPC 메서드를 직접 호출할 수 있다.
 */
export function createCallRpcTool(): ToolDefinition {
  const parameters = Type.Object({
    method: Type.String({ description: "RPC method name (e.g. 'stock.current_price')" }),
    params: Type.Optional(
      Type.Record(Type.String(), Type.Unknown(), {
        description: 'Method parameters as key-value pairs',
      }),
    ),
  });

  return {
    name: 'call_rpc_method',
    label: 'Call RPC',
    description: [
      'RPC 메서드를 직접 호출합니다. 사용 가능한 카테고리:',
      ...Object.entries(CATEGORY_DESCRIPTIONS)
        .filter(([k]) => k !== 'rpc' && k !== 'session')
        .map(([k, v]) => `  ${k}: ${v}`),
    ].join('\n'),
    parameters,
    async execute(
      _toolCallId: string,
      toolParams: { method: string; params?: Record<string, unknown> },
    ): Promise<AgentToolResult<null>> {
      const { method, params: rpcParams } = toolParams;
      const { client, registry, initializedBrokers } = await getRpcContext();

      let rpcMethod = method;
      // 언더스코어 표기법이면 도트 표기법으로 변환 시도
      if (!rpcMethod.includes('.') && rpcMethod.includes('_')) {
        const resolved = registry.getMethodByToolName(rpcMethod);
        if (resolved) {
          rpcMethod = resolved.name;
        }
      }

      // 필수 파라미터 누락 시 사전 검증
      const methodSchema = registry.getMethodByName(rpcMethod);
      if (methodSchema) {
        const schema = methodSchema.parameters as { required?: string[] };
        const required = schema.required ?? [];
        const missing = required.filter((k) => !(k in (rpcParams ?? {})));
        if (missing.length > 0) {
          const paramInfo = registry.getParamSummary(methodSchema);
          return {
            content: [
              {
                type: 'text',
                text: `[ERROR] ${rpcMethod}: 필수 파라미터 누락: ${missing.join(', ')}\n\nParameters:\n${paramInfo}`,
              },
            ],
            details: null,
          };
        }
      }

      try {
        const broker = methodSchema?.broker ?? null;
        if (broker && !initializedBrokers.has(broker)) {
          await client.request('session.initialize', { broker });
          initializedBrokers.add(broker);
        }

        const result = await client.request(rpcMethod, rpcParams ?? {});
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          details: null,
        };
      } catch (err) {
        const msg =
          err instanceof JsonRpcRemoteError
            ? `RPC error (${err.code}): ${err.message}${err.data ? `\n${JSON.stringify(err.data)}` : ''}`
            : err instanceof Error
              ? err.message
              : String(err);
        return {
          content: [{ type: 'text', text: `[ERROR] ${rpcMethod}: ${msg}` }],
          details: null,
        };
      }
    },
  } satisfies ToolDefinition;
}
