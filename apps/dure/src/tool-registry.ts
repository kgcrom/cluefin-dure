import type {
  AgentToolResult,
  ExtensionContext,
  ToolDefinition,
} from "@mariozechner/pi-coding-agent";
import { type TSchema, Type } from "@sinclair/typebox";
import { JsonRpcRemoteError } from "./jsonrpc.js";
import type { StdioJsonRpcClient } from "./stdio-jsonrpc-client.js";

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

  /**
   * Discover available RPC methods from the server.
   * Calls rpc.list_methods and caches the result.
   */
  async discover(filter?: { category?: string; broker?: string }): Promise<void> {
    const result = await this.client.request<RpcMethodSchema[]>("rpc.list_methods", filter ?? {});
    this.methods = result;
  }

  /**
   * Get unique category names from discovered methods.
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const method of this.methods) {
      categories.add(method.category);
    }
    return [...categories].sort();
  }

  /**
   * Get methods belonging to a specific category from local cache.
   */
  getMethodsByCategory(category: string): RpcMethodSchema[] {
    return this.methods.filter((m) => m.category === category);
  }

  /**
   * Fetch methods for a specific category from the RPC server.
   * Merges results into the local cache (deduplicating by name).
   */
  async fetchMethodsByCategory(category: string): Promise<RpcMethodSchema[]> {
    const result = await this.client.request<RpcMethodSchema[]>("rpc.list_methods", { category });
    const existingNames = new Set(this.methods.map((m) => m.name));
    for (const method of result) {
      if (!existingNames.has(method.name)) {
        this.methods.push(method);
        existingNames.add(method.name);
      }
    }
    return result;
  }

  /**
   * Convert RPC methods to pi-mono ToolDefinition[].
   * Method names are transformed: "basic_quote.stock_current_price" → "basic_quote_stock_current_price"
   * Parameters JSON Schema is wrapped with Type.Unsafe() for TypeBox compatibility.
   */
  toPiTools(options: {
    methods?: RpcMethodSchema[];
    initializedBrokers: Set<string>;
  }): ToolDefinition[] {
    const methods = options.methods ?? this.methods;
    const client = this.client;
    const { initializedBrokers } = options;

    return methods.map((method) => {
      const toolName = method.name.replaceAll(".", "_");
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
          _onUpdate: undefined,
          _ctx: ExtensionContext,
        ): Promise<AgentToolResult<null>> {
          try {
            // Auto-initialize broker session if needed
            const broker = method.broker;
            if (broker && !initializedBrokers.has(broker)) {
              await client.request("session.initialize", { broker });
              initializedBrokers.add(broker);
            }

            const result = await client.request(method.name, toolParams);
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
              details: null,
            };
          } catch (err) {
            const msg =
              err instanceof JsonRpcRemoteError
                ? `RPC error (${err.code}): ${err.message}${err.data ? `\n${JSON.stringify(err.data)}` : ""}`
                : err instanceof Error
                  ? err.message
                  : String(err);
            return {
              content: [{ type: "text", text: `[ERROR] ${method.name}: ${msg}` }],

              details: null,
            };
          }
        },
      } satisfies ToolDefinition;
    });
  }

  /**
   * Call an RPC method by its tool name (dots replaced with underscores).
   */
  async callTool(toolName: string, params: unknown): Promise<unknown> {
    const method = this.getMethodByToolName(toolName);
    if (!method) {
      throw new Error(`Unknown tool: ${toolName}`);
    }
    return this.client.request(method.name, params);
  }

  /**
   * Get method schema by its original RPC name.
   */
  getMethodByName(name: string): RpcMethodSchema | undefined {
    return this.methods.find((m) => m.name === name);
  }

  /**
   * Get method schema by its tool name (dots replaced with underscores).
   */
  getMethodByToolName(toolName: string): RpcMethodSchema | undefined {
    return this.methods.find((m) => m.name.replaceAll(".", "_") === toolName);
  }

  /**
   * Get all discovered methods.
   */
  getMethods(): RpcMethodSchema[] {
    return [...this.methods];
  }

  /**
   * Get category summary with method names and descriptions.
   */
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

  /**
   * Get compact parameter summary text for a method.
   */
  getParamSummary(method: RpcMethodSchema): string {
    const schema = method.parameters as {
      properties?: Record<string, { type?: string; description?: string }>;
      required?: string[];
    };
    const props = schema.properties;
    if (!props || Object.keys(props).length === 0) return "(파라미터 없음)";

    const required = new Set(schema.required ?? []);
    return Object.entries(props)
      .map(([key, val]) => {
        const opt = required.has(key) ? "" : "?";
        const type = val.type ?? "unknown";
        const desc = val.description ? ` — ${val.description}` : "";
        return `  ${key}${opt}: ${type}${desc}`;
      })
      .join("\n");
  }
}
