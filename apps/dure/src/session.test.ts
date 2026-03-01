import { describe, expect, test } from "vitest";
import { detectBroker } from "./session.js";

describe("detectBroker", () => {
  test("dart broker methods (still use broker prefix)", () => {
    expect(detectBroker("dart.disclosure_search")).toBe("dart");
    expect(detectBroker("dart.company_overview")).toBe("dart");
  });

  test("ta methods skip session", () => {
    expect(detectBroker("ta.sma")).toBeNull();
    expect(detectBroker("ta.rsi")).toBeNull();
  });

  test("rpc methods skip session", () => {
    expect(detectBroker("rpc.ping")).toBeNull();
    expect(detectBroker("rpc.list_methods")).toBeNull();
  });

  test("session methods skip session", () => {
    expect(detectBroker("session.initialize")).toBeNull();
    expect(detectBroker("session.close")).toBeNull();
  });

  test("test methods skip session", () => {
    expect(detectBroker("test.echo")).toBeNull();
  });

  test("new semantic method names return null (broker from schema instead)", () => {
    // New naming scheme: broker prefix removed, broker comes from RpcMethodSchema.broker
    expect(detectBroker("stock.current_price")).toBeNull();
    expect(detectBroker("chart.daily")).toBeNull();
    expect(detectBroker("ranking.trading_volume")).toBeNull();
    expect(detectBroker("sector.current_price")).toBeNull();
    expect(detectBroker("etf.return_rate")).toBeNull();
  });

  test("unknown methods return null", () => {
    expect(detectBroker("unknown.method")).toBeNull();
  });
});
