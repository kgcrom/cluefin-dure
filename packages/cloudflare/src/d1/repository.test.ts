import { describe, expect, test, vi } from "vitest";
import { createOrderRepository } from "./repository.js";
import type { EntryOrderRow } from "./types.js";

const sampleRow: EntryOrderRow = {
  id: 1,
  stock_code: "005930",
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
  const bindFn = vi.fn(() => mockStmt);
  const mockStmt: Record<string, unknown> = {
    bind: bindFn,
    all: vi.fn(() => Promise.resolve({ results: [sampleRow] })),
    first: vi.fn(() => Promise.resolve(sampleRow)),
    run: vi.fn(() => Promise.resolve()),
    ...overrides,
  };

  return {
    db: { prepare: vi.fn(() => mockStmt) } as unknown as D1Database,
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

  test("getEntryOrderById returns mapped order", async () => {
    const { db } = createMockDB();
    const repo = createOrderRepository(db);

    const order = await repo.getEntryOrderById(1);

    expect(order).not.toBeNull();
    expect(order?.id).toBe(1);
    expect(order?.broker).toBe("kis");
  });

  test("getEntryOrderById returns null when not found", async () => {
    const { db } = createMockDB({
      first: vi.fn(() => Promise.resolve(null)),
    });
    const repo = createOrderRepository(db);

    const order = await repo.getEntryOrderById(999);
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
