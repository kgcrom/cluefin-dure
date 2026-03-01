import { describe, expect, test, vi, beforeEach } from "vitest";
import type { ExtensionAPI, ToolDefinition } from "@mariozechner/pi-coding-agent";

const MOCK_METHODS = [
  {
    name: "basic_quote.stock_current_price",
    description: "Get current stock price",
    category: "basic_quote",
    broker: "kis",
    parameters: { type: "object", properties: { stock_code: { type: "string" } } },
    returns: { type: "object" },
    requires_session: true,
  },
  {
    name: "ta.sma",
    description: "Simple Moving Average",
    category: "ta",
    broker: null,
    parameters: { type: "object", properties: { close: { type: "array" } } },
    returns: { type: "object" },
    requires_session: false,
  },
  {
    name: "rpc.ping",
    description: "Ping RPC server",
    category: "rpc",
    broker: null,
    parameters: { type: "object" },
    returns: { type: "object" },
    requires_session: false,
  },
];

// Mock the extension module's dependencies
vi.mock("./stdio-jsonrpc-client.js", () => ({
  StdioJsonRpcClient: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    close: vi.fn(async () => {}),
    request: vi.fn(async (method: string, params?: unknown) => {
      if (method === "rpc.list_methods") return MOCK_METHODS;
      if (method === "session.initialize") return { initialized: true };
      if (method === "basic_quote.stock_current_price") return { current_price: 72300 };
      if (method === "ta.sma") return { result: [50, 51] };
      throw new Error(`Unknown method: ${method}`);
    }),
    notify: vi.fn(),
  })),
}));

vi.mock("./system-prompt.js", () => ({
  buildSystemPrompt: vi.fn(() => "Test system prompt"),
}));

describe("cluefin extension", () => {
  let registeredTools: Map<string, ToolDefinition>;
  let eventHandlers: Map<string, Array<(...args: unknown[]) => unknown>>;
  let mockPi: ExtensionAPI;

  beforeEach(() => {
    registeredTools = new Map();
    eventHandlers = new Map();

    mockPi = {
      registerTool: vi.fn((tool: ToolDefinition) => {
        registeredTools.set(tool.name, tool);
      }),
      on: vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
        if (!eventHandlers.has(event)) eventHandlers.set(event, []);
        eventHandlers.get(event)!.push(handler);
      }),
    } as unknown as ExtensionAPI;
  });

  async function loadExtension() {
    // Re-import to get fresh module with mocks
    const { default: cluefinExtension } = await import("./extension.js");
    await cluefinExtension(mockPi);
  }

  async function triggerEvent(event: string, data?: unknown) {
    const handlers = eventHandlers.get(event) ?? [];
    let result: unknown;
    for (const handler of handlers) {
      result = await handler(data);
    }
    return result;
  }

  test("registers session_start, session_shutdown, and before_agent_start handlers", async () => {
    await loadExtension();

    expect(mockPi.on).toHaveBeenCalledWith("session_start", expect.any(Function));
    expect(mockPi.on).toHaveBeenCalledWith("session_shutdown", expect.any(Function));
    expect(mockPi.on).toHaveBeenCalledWith("before_agent_start", expect.any(Function));
  });

  test("session_start registers 3 meta tools", async () => {
    await loadExtension();
    await triggerEvent("session_start");

    expect(registeredTools.has("list_tool_categories")).toBe(true);
    expect(registeredTools.has("load_category_tools")).toBe(true);
    expect(registeredTools.has("call_rpc_method")).toBe(true);
  });

  test("list_tool_categories returns non-system categories", async () => {
    await loadExtension();
    await triggerEvent("session_start");

    const tool = registeredTools.get("list_tool_categories")!;
    const result = await tool.execute("id", {}, undefined, undefined, {} as never);

    const categories = JSON.parse(result.content[0].text);
    const categoryNames = categories.map((c: { category: string }) => c.category);

    expect(categoryNames).toContain("basic_quote");
    expect(categoryNames).toContain("ta");
    expect(categoryNames).not.toContain("rpc");
    expect(categoryNames).not.toContain("session");
  });

  test("load_category_tools registers category methods as tools", async () => {
    await loadExtension();
    await triggerEvent("session_start");

    const tool = registeredTools.get("load_category_tools")!;
    const result = await tool.execute("id", { category: "basic_quote" }, undefined, undefined, {} as never);

    expect(registeredTools.has("basic_quote_stock_current_price")).toBe(true);
    expect(result.content[0].text).toContain("1 tools");
    expect(result.content[0].text).toContain("basic_quote");
  });

  test("load_category_tools skips already loaded categories", async () => {
    await loadExtension();
    await triggerEvent("session_start");

    const tool = registeredTools.get("load_category_tools")!;
    await tool.execute("id", { category: "ta" }, undefined, undefined, {} as never);
    const result = await tool.execute("id", { category: "ta" }, undefined, undefined, {} as never);

    expect(result.content[0].text).toContain("already loaded");
  });

  test("load_category_tools returns error for unknown category", async () => {
    await loadExtension();
    await triggerEvent("session_start");

    const tool = registeredTools.get("load_category_tools")!;
    const result = await tool.execute("id", { category: "nonexistent" }, undefined, undefined, {} as never);

    expect(result.content[0].text).toContain("not found");
  });

  test("call_rpc_method calls RPC method directly", async () => {
    await loadExtension();
    await triggerEvent("session_start");

    const tool = registeredTools.get("call_rpc_method")!;
    const result = await tool.execute(
      "id",
      { method: "ta.sma", params: { close: [50, 51, 52] } },
      undefined,
      undefined,
      {} as never,
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({ result: [50, 51] });
  });

  test("before_agent_start returns system prompt", async () => {
    await loadExtension();
    const result = await triggerEvent("before_agent_start");

    expect(result).toEqual({ systemPrompt: "Test system prompt" });
  });
});
