import type { StdioJsonRpcClient } from "./stdio-jsonrpc-client";

type RpcMethodSchema = {
  name: string;
  description: string;
  category: string;
  broker: string | null;
  parameters: Record<string, unknown>;
  returns: Record<string, unknown>;
  requires_session: boolean;
};

type AnthropicTool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
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
   * Convert discovered RPC methods to Anthropic tool_use format.
   * Method names are transformed: "quote.kis.stock_current" → "quote_kis_stock_current"
   */
  toAnthropicTools(): AnthropicTool[] {
    return this.methods.map((method) => ({
      name: method.name.replaceAll(".", "_"),
      description: method.description,
      input_schema: method.parameters,
    }));
  }

  /**
   * Call an RPC method by its Anthropic tool name.
   * Reverse-maps "quote_kis_stock_current" → "quote.kis.stock_current"
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
   * Get method schema by its Anthropic tool name (dots replaced with underscores).
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
