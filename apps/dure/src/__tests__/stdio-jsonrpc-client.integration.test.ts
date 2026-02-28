import { afterEach, describe, expect, test } from "bun:test";
import path from "node:path";
import { JsonRpcRemoteError } from "../jsonrpc";
import { StdioJsonRpcClient } from "../stdio-jsonrpc-client";
import { ToolRegistry } from "../tool-registry";

const MOCK_SERVER = path.resolve(import.meta.dir, "mock-rpc-server.ts");

function createTestClient(timeoutMs = 5_000): StdioJsonRpcClient {
  return new StdioJsonRpcClient({
    cmd: ["bun", "run", MOCK_SERVER],
    defaultTimeoutMs: timeoutMs,
  });
}

describe("StdioJsonRpcClient integration", () => {
  let client: StdioJsonRpcClient;

  afterEach(async () => {
    await client?.close();
  });

  test("ping: basic request/response", async () => {
    client = createTestClient();
    client.start();

    const result = await client.request<{ pong: boolean }>("rpc.ping");

    expect(result).toEqual({ pong: true });
  });

  test("echo: params round-trip", async () => {
    client = createTestClient();
    client.start();

    const params = { hello: "world", count: 42, nested: { a: [1, 2, 3] } };
    const result = await client.request("test.echo", params);

    expect(result).toEqual(params);
  });

  test("sequential requests: IDs are matched correctly", async () => {
    client = createTestClient();
    client.start();

    const r1 = await client.request<{ pong: boolean }>("rpc.ping");
    const r2 = await client.request("test.echo", { seq: 2 });
    const r3 = await client.request<{ pong: boolean }>("rpc.ping");

    expect(r1).toEqual({ pong: true });
    expect(r2).toEqual({ seq: 2 });
    expect(r3).toEqual({ pong: true });
  });

  test("concurrent requests: all resolve independently", async () => {
    client = createTestClient();
    client.start();

    const [ping, echo, quote] = await Promise.all([
      client.request<{ pong: boolean }>("rpc.ping"),
      client.request("test.echo", { key: "value" }),
      client.request("kis.basic_quote.stock_current_price", { stock_code: "005930" }),
    ]);

    expect(ping).toEqual({ pong: true });
    expect(echo).toEqual({ key: "value" });
    expect(quote).toEqual({
      stock_code: "005930",
      current_price: 72300,
      volume: 1234567,
      change_rate: 1.25,
    });
  });

  test("error response: method not found", async () => {
    client = createTestClient();
    client.start();

    try {
      await client.request("nonexistent.method");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(JsonRpcRemoteError);
      const rpcError = error as JsonRpcRemoteError;
      expect(rpcError.code).toBe(-32601);
      expect(rpcError.message).toContain("Method not found");
    }
  });

  test("timeout: slow response triggers timeout error", async () => {
    client = createTestClient(200);
    client.start();

    try {
      await client.request("test.slow", { delay_ms: 2000 }, 200);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("timeout");
    }
  });

  test("request before start throws", () => {
    client = createTestClient();

    expect(client.request("rpc.ping")).rejects.toThrow("not started");
  });

  test("session.initialize: broker session setup", async () => {
    client = createTestClient();
    client.start();

    const result = await client.request<{ initialized: boolean; broker: string }>(
      "session.initialize",
      { broker: "kis" },
    );

    expect(result).toEqual({ initialized: true, broker: "kis" });
  });

  test("ta.sma: computation via mock server", async () => {
    client = createTestClient();
    client.start();

    const result = await client.request<{ sma: number; period: number }>("ta.sma", {
      close: [100, 200, 300, 400, 500],
      timeperiod: 3,
    });

    expect(result.sma).toBe(400); // (300+400+500)/3
    expect(result.period).toBe(3);
  });
});

describe("ToolRegistry integration", () => {
  let client: StdioJsonRpcClient;

  afterEach(async () => {
    await client?.close();
  });

  test("discover + toAnthropicTools via real subprocess", async () => {
    client = createTestClient();
    client.start();

    const registry = new ToolRegistry(client);
    await registry.discover();

    const tools = registry.toAnthropicTools();

    expect(tools.length).toBeGreaterThanOrEqual(3);
    const names = tools.map((t) => t.name);
    expect(names).toContain("rpc_ping");
    expect(names).toContain("kis_basic_quote_stock_current_price");
    expect(names).toContain("ta_sma");
  });

  test("discover with filter", async () => {
    client = createTestClient();
    client.start();

    const registry = new ToolRegistry(client);
    await registry.discover({ category: "kis.basic_quote", broker: "kis" });

    const tools = registry.toAnthropicTools();

    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe("kis_basic_quote_stock_current_price");
  });

  test("callTool via real subprocess", async () => {
    client = createTestClient();
    client.start();

    const registry = new ToolRegistry(client);
    await registry.discover();

    const result = await registry.callTool("kis_basic_quote_stock_current_price", {
      stock_code: "005930",
    });

    expect(result).toEqual({
      stock_code: "005930",
      current_price: 72300,
      volume: 1234567,
      change_rate: 1.25,
    });
  });
});
