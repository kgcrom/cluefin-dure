import { describe, expect, test } from "vitest";
import { parseMessageLine } from "./jsonrpc.js";

describe("jsonrpc helpers", () => {
  test("parseMessageLine rejects non JSON-RPC payload", () => {
    expect(() => parseMessageLine('{"id":1,"result":{}}')).toThrow("Invalid JSON-RPC 2.0 message");
  });
});
