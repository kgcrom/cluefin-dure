import { Type, type TSchema } from "@sinclair/typebox";
import type { AgentToolResult, ExtensionContext, ToolDefinition } from "@mariozechner/pi-coding-agent";
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
   * Get methods belonging to a specific category.
   */
  getMethodsByCategory(category: string): RpcMethodSchema[] {
    return this.methods.filter((m) => m.category === category);
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
}
