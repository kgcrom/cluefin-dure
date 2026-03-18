import type {
  AgentToolResult,
  AgentToolUpdateCallback,
  ExtensionContext,
  ToolDefinition,
} from '@mariozechner/pi-coding-agent';
import { type TSchema, Type } from '@sinclair/typebox';
import { JsonRpcRemoteError } from './jsonrpc.js';
import type { StdioJsonRpcClient } from './stdio-jsonrpc-client.js';

export type RpcMethodSchema = {
  name: string;
  description: string;
  category: string;
  broker: string | null;
  parameters: Record<string, unknown>;
  returns: Record<string, unknown>;
  requires_session: boolean;
};

export class ToolRegistry {
  private methods: RpcMethodSchema[] = [];
  private client: StdioJsonRpcClient;

  constructor(client: StdioJsonRpcClient) {
    this.client = client;
  }

  async discover(filter?: { category?: string; broker?: string }): Promise<void> {
    const result = await this.client.request<RpcMethodSchema[]>('rpc.list_methods', filter ?? {});
    this.methods = result;
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    for (const method of this.methods) {
      categories.add(method.category);
    }
    return [...categories].sort();
  }

  getMethodsByCategory(category: string): RpcMethodSchema[] {
    return this.methods.filter((m) => m.category === category);
  }

  async fetchMethodsByCategory(category: string): Promise<RpcMethodSchema[]> {
    const result = await this.client.request<RpcMethodSchema[]>('rpc.list_methods', { category });
    const existingNames = new Set(this.methods.map((m) => m.name));
    for (const method of result) {
      if (!existingNames.has(method.name)) {
        this.methods.push(method);
        existingNames.add(method.name);
      }
    }
    return result;
  }

  toPiTools(options: {
    methods?: RpcMethodSchema[];
    initializedBrokers: Set<string>;
  }): ToolDefinition[] {
    const methods = options.methods ?? this.methods;
    const client = this.client;
    const { initializedBrokers } = options;

    return methods.map((method) => {
      const toolName = method.name.replaceAll('.', '_');
      const params = Type.Unsafe(method.parameters as TSchema);

      return {
        name: toolName,
        label: toolName,
        description: method.description,
        parameters: params,
        async execute(
          _toolCallId: string,
          toolParams: Record<string, unknown>,
          _signal: AbortSignal | undefined,
          _onUpdate: AgentToolUpdateCallback<null> | undefined,
          _ctx: ExtensionContext,
        ): Promise<AgentToolResult<null>> {
          try {
            const broker = method.broker;
            if (broker && !initializedBrokers.has(broker)) {
              await client.request('session.initialize', { broker });
              initializedBrokers.add(broker);
            }

            const result = await client.request(method.name, toolParams);
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
              content: [{ type: 'text', text: `[ERROR] ${method.name}: ${msg}` }],
              details: null,
            };
          }
        },
      } satisfies ToolDefinition;
    });
  }

  async callTool(toolName: string, params: unknown): Promise<unknown> {
    const method = this.getMethodByToolName(toolName);
    if (!method) {
      throw new Error(`Unknown tool: ${toolName}`);
    }
    return this.client.request(method.name, params);
  }

  getMethodByName(name: string): RpcMethodSchema | undefined {
    return this.methods.find((m) => m.name === name);
  }

  getMethodByToolName(toolName: string): RpcMethodSchema | undefined {
    return this.methods.find((m) => m.name.replaceAll('.', '_') === toolName);
  }

  getMethods(): RpcMethodSchema[] {
    return [...this.methods];
  }

  getCategorySummary(): {
    category: string;
    count: number;
    methods: { name: string; description: string }[];
  }[] {
    const categoryMap = new Map<string, RpcMethodSchema[]>();
    for (const method of this.methods) {
      const list = categoryMap.get(method.category) ?? [];
      list.push(method);
      categoryMap.set(method.category, list);
    }

    return [...categoryMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, methods]) => ({
        category,
        count: methods.length,
        methods: methods.map((m) => ({ name: m.name, description: m.description })),
      }));
  }

  getParamSummary(method: RpcMethodSchema): string {
    const schema = method.parameters as {
      properties?: Record<string, { type?: string; description?: string }>;
      required?: string[];
    };
    const props = schema.properties;
    if (!props || Object.keys(props).length === 0) return '(파라미터 없음)';

    const required = new Set(schema.required ?? []);
    return Object.entries(props)
      .map(([key, val]) => {
        const opt = required.has(key) ? '' : '?';
        const type = val.type ?? 'unknown';
        const desc = val.description ? ` — ${val.description}` : '';
        return `  ${key}${opt}: ${type}${desc}`;
      })
      .join('\n');
  }
}
