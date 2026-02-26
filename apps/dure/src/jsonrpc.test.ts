import { describe, expect, test } from "bun:test";
import { createErrorResponse, createRequest, parseMessageLine, serializeMessage } from "./jsonrpc";

describe("jsonrpc helpers", () => {
  test("createRequest builds JSON-RPC 2.0 request", () => {
    const request = createRequest(1, "stock.get_quote", { symbol: "005930" });

    expect(request).toEqual({
      jsonrpc: "2.0",
      id: 1,
      method: "stock.get_quote",
      params: { symbol: "005930" },
    });
  });

  test("serializeMessage appends newline", () => {
    const wire = serializeMessage({ jsonrpc: "2.0", id: 1, result: { ok: true } });

    expect(wire).toBe('{"jsonrpc":"2.0","id":1,"result":{"ok":true}}\n');
  });

  test("parseMessageLine parses valid JSON-RPC message", () => {
    const message = parseMessageLine('{"jsonrpc":"2.0","id":2,"result":{"price":72300}}');

    expect(message).toEqual({
      jsonrpc: "2.0",
      id: 2,
      result: { price: 72300 },
    });
  });

  test("parseMessageLine rejects non JSON-RPC payload", () => {
    expect(() => parseMessageLine('{"id":1,"result":{}}')).toThrow("Invalid JSON-RPC 2.0 message");
  });

  test("createErrorResponse builds error object", () => {
    const error = createErrorResponse(4, -32601, "Method not found");

    expect(error).toEqual({
      jsonrpc: "2.0",
      id: 4,
      error: {
        code: -32601,
        message: "Method not found",
      },
    });
  });
});
