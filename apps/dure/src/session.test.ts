import { describe, expect, test } from "bun:test";
import { detectBroker } from "./session";

describe("detectBroker", () => {
  test("kis broker methods", () => {
    expect(detectBroker("kis.basic_quote.stock_current_price")).toBe("kis");
    expect(detectBroker("kis.stock_info.product_basic_info")).toBe("kis");
    expect(detectBroker("kis.ranking.trading_volume")).toBe("kis");
  });

  test("kiwoom broker methods", () => {
    expect(detectBroker("kiwoom.chart.stock_daily")).toBe("kiwoom");
    expect(detectBroker("kiwoom.etf.return_rate")).toBe("kiwoom");
  });

  test("dart broker methods", () => {
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

  test("quote.krx methods skip session", () => {
    expect(detectBroker("quote.krx.kospi")).toBeNull();
  });

  test("unknown broker returns null", () => {
    expect(detectBroker("unknown.method")).toBeNull();
  });
});
