import { describe, expect, mock, test } from "bun:test";
import { createOrderRepository } from "./repository";
import type { TradeOrderRow } from "./types";

const sampleRow: TradeOrderRow = {
  id: 1,
  stock_code: "005930",
  side: "buy",
  reference_price: 70000,
  quantity: 10,
  trailing_stop_pct: 3.0,
  broker: "kis",
  market: "kospi",
  status: "pending",
  peak_price: null,
  created_at: "2025-01-01 00:00:00",
  updated_at: "2025-01-01 00:00:00",
};

function createMockDB(overrides: Record<string, unknown> = {}) {
  const bindFn = mock(() => mockStmt);
  const mockStmt: Record<string, unknown> = {
    bind: bindFn,
    all: mock(() => Promise.resolve({ results: [sampleRow] })),
    first: mock(() => Promise.resolve(sampleRow)),
    run: mock(() => Promise.resolve()),
    ...overrides,
  };

  return {
    db: { prepare: mock(() => mockStmt) } as unknown as D1Database,
    mockStmt,
    bindFn,
  };
}

describe("createOrderRepository", () => {
  test("getActiveOrders with broker filter", async () => {
    const { db, mockStmt } = createMockDB();
    const repo = createOrderRepository(db);

    await repo.getActiveOrders("kis");

    expect(mockStmt.bind).toHaveBeenCalledWith("pending", "monitoring", "kis");
  });

  test("getOrderById returns mapped order", async () => {
    const { db } = createMockDB();
    const repo = createOrderRepository(db);

    const order = await repo.getOrderById(1);

    expect(order).not.toBeNull();
    expect(order?.id).toBe(1);
    expect(order?.side).toBe("buy");
    expect(order?.broker).toBe("kis");
  });

  test("getOrderById returns null when not found", async () => {
    const { db } = createMockDB({
      first: mock(() => Promise.resolve(null)),
    });
    const repo = createOrderRepository(db);

    const order = await repo.getOrderById(999);
    expect(order).toBeNull();
  });

  test("updateOrderStatus calls correct SQL", async () => {
    const { db, mockStmt } = createMockDB();
    const repo = createOrderRepository(db);

    await repo.updateOrderStatus(1, "executed");

    expect(mockStmt.bind).toHaveBeenCalledWith("executed", 1);
    expect(mockStmt.run).toHaveBeenCalled();
  });
});
