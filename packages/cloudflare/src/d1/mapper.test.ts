import { describe, expect, test } from "vitest";
import { toEntryOrder, toTradeExecution } from "./mapper.js";
import type { EntryOrderRow, TradeExecutionRow } from "./types.js";

describe("toEntryOrder", () => {
  test("snake_case를 camelCase로 변환", () => {
    const row: EntryOrderRow = {
      id: 1,
      stock_code: "005930",
      reference_price: 70000,
      quantity: 10,
      trailing_stop_pct: 3.5,
      broker: "kis",
      market: "kospi",
      status: "pending",
      peak_price: null,
      created_at: "2024-01-15 10:30:00",
      updated_at: "2024-01-15 10:30:00",
    };

    const result = toEntryOrder(row);

    expect(result).toEqual({
      id: 1,
      stockCode: "005930",
      referencePrice: 70000,
      quantity: 10,
      trailingStopPct: 3.5,
      broker: "kis",
      market: "kospi",
      status: "pending",
      peakPrice: null,
      createdAt: "2024-01-15 10:30:00",
      updatedAt: "2024-01-15 10:30:00",
    });
  });

  test("null 필드 처리", () => {
    const row: EntryOrderRow = {
      id: 2,
      stock_code: "035720",
      reference_price: 50000,
      quantity: 5,
      trailing_stop_pct: 2.0,
      broker: "kiwoom",
      market: "kosdaq",
      status: "monitoring",
      peak_price: null,
      created_at: "2024-01-16 09:00:00",
      updated_at: "2024-01-16 09:00:00",
    };

    const result = toEntryOrder(row);

    expect(result.peakPrice).toBeNull();
  });

  test("모든 필드 타입 보존", () => {
    const row: EntryOrderRow = {
      id: 3,
      stock_code: "000660",
      reference_price: 120000,
      quantity: 100,
      trailing_stop_pct: 5.0,
      broker: "kis",
      market: "kospi",
      status: "executed",
      peak_price: 130000,
      created_at: "2024-01-17 14:00:00",
      updated_at: "2024-01-17 15:30:00",
    };

    const result = toEntryOrder(row);

    expect(typeof result.id).toBe("number");
    expect(typeof result.stockCode).toBe("string");
    expect(typeof result.referencePrice).toBe("number");
    expect(typeof result.quantity).toBe("number");
    expect(typeof result.trailingStopPct).toBe("number");
    expect(typeof result.broker).toBe("string");
    expect(typeof result.status).toBe("string");
    expect(typeof result.createdAt).toBe("string");
    expect(typeof result.updatedAt).toBe("string");
  });
});

describe("toTradeExecution", () => {
  test("snake_case를 camelCase로 변환", () => {
    const row: TradeExecutionRow = {
      id: 1,
      entry_order_id: 10,
      broker_order_id: "ORD-12345",
      requested_qty: 50,
      requested_price: 70000,
      filled_qty: 50,
      filled_price: 69900,
      status: "filled",
      broker: "kis",
      broker_response: '{"success": true}',
      ordered_at: "2024-01-15 10:30:00",
      filled_at: "2024-01-15 10:31:00",
    };

    const result = toTradeExecution(row);

    expect(result).toEqual({
      id: 1,
      entryOrderId: 10,
      brokerOrderId: "ORD-12345",
      requestedQty: 50,
      requestedPrice: 70000,
      filledQty: 50,
      filledPrice: 69900,
      status: "filled",
      broker: "kis",
      brokerResponse: '{"success": true}',
      orderedAt: "2024-01-15 10:30:00",
      filledAt: "2024-01-15 10:31:00",
    });
  });

  test("null 필드 처리", () => {
    const row: TradeExecutionRow = {
      id: 2,
      entry_order_id: 20,
      broker_order_id: "ORD-67890",
      requested_qty: 100,
      requested_price: 50000,
      filled_qty: null,
      filled_price: null,
      status: "ordered",
      broker: "kiwoom",
      broker_response: null,
      ordered_at: "2024-01-16 09:00:00",
      filled_at: null,
    };

    const result = toTradeExecution(row);

    expect(result.filledQty).toBeNull();
    expect(result.filledPrice).toBeNull();
    expect(result.brokerResponse).toBeNull();
    expect(result.filledAt).toBeNull();
  });

  test("부분 체결 상태 처리", () => {
    const row: TradeExecutionRow = {
      id: 3,
      entry_order_id: 30,
      broker_order_id: "ORD-PARTIAL",
      requested_qty: 100,
      requested_price: 80000,
      filled_qty: 30,
      filled_price: 79500,
      status: "partial",
      broker: "kis",
      broker_response: '{"partial": true}',
      ordered_at: "2024-01-17 11:00:00",
      filled_at: "2024-01-17 11:05:00",
    };

    const result = toTradeExecution(row);

    expect(result.status).toBe("partial");
    expect(result.filledQty).toBe(30);
    expect(result.requestedQty).toBe(100);
  });
});
