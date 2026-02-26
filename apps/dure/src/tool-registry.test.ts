import { describe, expect, mock, test } from "bun:test";
import { ToolRegistry } from "./tool-registry";

// Mock client that returns predefined method schemas
function createMockClient(methods: unknown[] = []) {
  return {
    request: mock(async (_method: string, _params?: unknown) => methods),
    start: mock(() => {}),
    close: mock(async () => {}),
    notify: mock((_method: string, _params?: unknown) => {}),
  } as unknown as import("./stdio-jsonrpc-client").StdioJsonRpcClient;
}

const SAMPLE_METHODS = [
  {
    name: "quote.kis.stock_current",
    description: "Get current stock price from KIS",
    category: "quote",
    broker: "kis",
    parameters: {
      type: "object",
      properties: { stock_code: { type: "string" } },
      required: ["stock_code"],
    },
    returns: { type: "object" },
    requires_session: true,
  },
  {
    name: "ta.sma",
    description: "Simple Moving Average",
    category: "ta",
    broker: null,
    parameters: {
      type: "object",
      properties: {
        close: { type: "array", items: { type: "number" } },
        timeperiod: { type: "integer" },
      },
      required: ["close"],
    },
    returns: { type: "object" },
    requires_session: false,
  },
];

describe("ToolRegistry", () => {
  test("discover fetches methods from server", async () => {
    const client = createMockClient(SAMPLE_METHODS);
    const registry = new ToolRegistry(client);

    await registry.discover();

    expect(client.request).toHaveBeenCalledWith("rpc.list_methods", {});
    expect(registry.getMethods()).toHaveLength(2);
  });

  test("discover with filter passes params", async () => {
    const client = createMockClient([SAMPLE_METHODS[0]]);
    const registry = new ToolRegistry(client);

    await registry.discover({ category: "quote", broker: "kis" });

    expect(client.request).toHaveBeenCalledWith("rpc.list_methods", {
      category: "quote",
      broker: "kis",
    });
  });

  test("toAnthropicTools converts method names", async () => {
    const client = createMockClient(SAMPLE_METHODS);
    const registry = new ToolRegistry(client);
    await registry.discover();

    const tools = registry.toAnthropicTools();

    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe("quote_kis_stock_current");
    expect(tools[0].description).toBe("Get current stock price from KIS");
    expect(tools[0].input_schema).toEqual(SAMPLE_METHODS[0].parameters);
    expect(tools[1].name).toBe("ta_sma");
  });

  test("callTool reverse-maps tool name to RPC method", async () => {
    const client = createMockClient(SAMPLE_METHODS);
    // Override request to return different results based on method
    client.request = mock(async (method: string, _params?: unknown) => {
      if (method === "rpc.list_methods") return SAMPLE_METHODS;
      if (method === "quote.kis.stock_current") return { current_price: 72300 };
      throw new Error(`Unexpected method: ${method}`);
    });

    const registry = new ToolRegistry(client);
    await registry.discover();

    const result = await registry.callTool("quote_kis_stock_current", {
      stock_code: "005930",
    });

    expect(result).toEqual({ current_price: 72300 });
    expect(client.request).toHaveBeenCalledWith("quote.kis.stock_current", {
      stock_code: "005930",
    });
  });

  test("callTool throws for unknown tool", async () => {
    const client = createMockClient(SAMPLE_METHODS);
    const registry = new ToolRegistry(client);
    await registry.discover();

    expect(registry.callTool("unknown_tool", {})).rejects.toThrow("Unknown tool: unknown_tool");
  });

  test("getMethodByName returns correct method", async () => {
    const client = createMockClient(SAMPLE_METHODS);
    const registry = new ToolRegistry(client);
    await registry.discover();

    expect(registry.getMethodByName("ta.sma")).toBeDefined();
    expect(registry.getMethodByName("ta.sma")?.category).toBe("ta");
    expect(registry.getMethodByName("nonexistent")).toBeUndefined();
  });
});
