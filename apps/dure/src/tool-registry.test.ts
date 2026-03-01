import { describe, expect, test, vi } from "vitest";
import { ToolRegistry } from "./tool-registry.js";

// Mock client that returns predefined method schemas
function createMockClient(methods: unknown[] = []) {
  return {
    request: vi.fn(async (_method: string, _params?: unknown) => methods),
    start: vi.fn(() => {}),
    close: vi.fn(async () => {}),
    notify: vi.fn((_method: string, _params?: unknown) => {}),
  } as unknown as import("./stdio-jsonrpc-client.js").StdioJsonRpcClient;
}

const SAMPLE_METHODS = [
  {
    name: "basic_quote.stock_current_price",
    description: "Get current stock price from KIS",
    category: "basic_quote",
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
  {
    name: "basic_quote.stock_period_quote",
    description: "Get OHLCV data",
    category: "basic_quote",
    broker: "kis",
    parameters: {
      type: "object",
      properties: { stock_code: { type: "string" } },
      required: ["stock_code"],
    },
    returns: { type: "object" },
    requires_session: true,
  },
];

describe("ToolRegistry", () => {
  test("discover fetches methods from server", async () => {
    const client = createMockClient(SAMPLE_METHODS);
    const registry = new ToolRegistry(client);

    await registry.discover();

    expect(client.request).toHaveBeenCalledWith("rpc.list_methods", {});
    expect(registry.getMethods()).toHaveLength(3);
  });

  test("discover with filter passes params", async () => {
    const client = createMockClient([SAMPLE_METHODS[0]]);
    const registry = new ToolRegistry(client);

    await registry.discover({ category: "basic_quote", broker: "kis" });

    expect(client.request).toHaveBeenCalledWith("rpc.list_methods", {
      category: "basic_quote",
      broker: "kis",
    });
  });

  test("getCategories returns unique sorted categories", async () => {
    const client = createMockClient(SAMPLE_METHODS);
    const registry = new ToolRegistry(client);
    await registry.discover();

    const categories = registry.getCategories();

    expect(categories).toEqual(["basic_quote", "ta"]);
  });

  test("getMethodsByCategory filters correctly", async () => {
    const client = createMockClient(SAMPLE_METHODS);
    const registry = new ToolRegistry(client);
    await registry.discover();

    const quoteTools = registry.getMethodsByCategory("basic_quote");
    const taTools = registry.getMethodsByCategory("ta");
    const emptyTools = registry.getMethodsByCategory("nonexistent");

    expect(quoteTools).toHaveLength(2);
    expect(taTools).toHaveLength(1);
    expect(emptyTools).toHaveLength(0);
  });

  test("toPiTools converts methods to ToolDefinition format", async () => {
    const client = createMockClient(SAMPLE_METHODS);
    const registry = new ToolRegistry(client);
    await registry.discover();

    const initializedBrokers = new Set<string>();
    const tools = registry.toPiTools({ initializedBrokers });

    expect(tools).toHaveLength(3);
    expect(tools[0].name).toBe("basic_quote_stock_current_price");
    expect(tools[0].description).toBe("Get current stock price from KIS");
    expect(tools[0].parameters).toBeDefined();
    expect(typeof tools[0].execute).toBe("function");
    expect(tools[1].name).toBe("ta_sma");
  });

  test("toPiTools execute calls RPC and auto-initializes broker session", async () => {
    const client = createMockClient(SAMPLE_METHODS);
    client.request = vi.fn(async (method: string, _params?: unknown) => {
      if (method === "rpc.list_methods") return SAMPLE_METHODS;
      if (method === "session.initialize") return { initialized: true };
      if (method === "basic_quote.stock_current_price") return { current_price: 72300 };
      throw new Error(`Unexpected method: ${method}`);
    });

    const registry = new ToolRegistry(client);
    await registry.discover();

    const initializedBrokers = new Set<string>();
    const tools = registry.toPiTools({
      methods: registry.getMethodsByCategory("basic_quote"),
      initializedBrokers,
    });

    const result = await tools[0].execute("call-1", { stock_code: "005930" }, undefined, undefined, {} as never);

    expect(client.request).toHaveBeenCalledWith("session.initialize", { broker: "kis" });
    expect(client.request).toHaveBeenCalledWith("basic_quote.stock_current_price", { stock_code: "005930" });
    expect(result.content[0]).toEqual({
      type: "text",
      text: JSON.stringify({ current_price: 72300 }, null, 2),
    });
    expect(initializedBrokers.has("kis")).toBe(true);
  });

  test("toPiTools skips session init for non-broker methods", async () => {
    const client = createMockClient(SAMPLE_METHODS);
    client.request = vi.fn(async (method: string, _params?: unknown) => {
      if (method === "rpc.list_methods") return SAMPLE_METHODS;
      if (method === "ta.sma") return { result: [50, 51, 52] };
      throw new Error(`Unexpected method: ${method}`);
    });

    const registry = new ToolRegistry(client);
    await registry.discover();

    const initializedBrokers = new Set<string>();
    const tools = registry.toPiTools({
      methods: registry.getMethodsByCategory("ta"),
      initializedBrokers,
    });

    await tools[0].execute("call-2", { close: [50, 51, 52, 53, 54] }, undefined, undefined, {} as never);

    expect(client.request).not.toHaveBeenCalledWith("session.initialize", expect.anything());
    expect(initializedBrokers.size).toBe(0);
  });

  test("callTool reverse-maps tool name to RPC method", async () => {
    const client = createMockClient(SAMPLE_METHODS);
    client.request = vi.fn(async (method: string, _params?: unknown) => {
      if (method === "rpc.list_methods") return SAMPLE_METHODS;
      if (method === "basic_quote.stock_current_price") return { current_price: 72300 };
      throw new Error(`Unexpected method: ${method}`);
    });

    const registry = new ToolRegistry(client);
    await registry.discover();

    const result = await registry.callTool("basic_quote_stock_current_price", {
      stock_code: "005930",
    });

    expect(result).toEqual({ current_price: 72300 });
    expect(client.request).toHaveBeenCalledWith("basic_quote.stock_current_price", {
      stock_code: "005930",
    });
  });

  test("callTool throws for unknown tool", async () => {
    const client = createMockClient(SAMPLE_METHODS);
    const registry = new ToolRegistry(client);
    await registry.discover();

    await expect(registry.callTool("unknown_tool", {})).rejects.toThrow(
      "Unknown tool: unknown_tool",
    );
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
