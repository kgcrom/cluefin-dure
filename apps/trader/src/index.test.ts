import { describe, expect, mock, test } from "bun:test";

mock.module("@cluefin/cloudflare", () => ({
  createOrderRepository: () => ({
    getActiveOrders: mock(),
    getRequestedQuantity: mock(),
    createExecution: mock(),
    updateOrderStatus: mock(),
    getUnfilledExecutions: mock(() => Promise.resolve([])),
    updateExecutionFill: mock(),
    getFilledQuantityForEntryOrder: mock(),
    createEntryOrder: mock(),
  }),
}));

mock.module("@cluefin/securities", () => ({
  createKisAuthClient: () => ({
    getToken: mock(),
  }),
  createKisMarketClient: () => ({}),
  createKisOrderClient: () => ({
    buyOrder: mock(),
    sellOrder: mock(),
    getDailyOrders: mock(),
  }),
  createKiwoomAuthClient: () => ({
    getToken: mock(),
  }),
  createKiwoomMarketClient: () => ({}),
  createKiwoomOrderClient: () => ({
    buyOrder: mock(),
    getDailyOrders: mock(),
  }),
}));

const { default: worker } = await import("./index");

const mockEnv = {
  KIS_APP_KEY: "test-key",
  KIS_SECRET_KEY: "test-secret",
  KIS_ENV: "dev",
  KIS_ACCOUNT_NO: "12345",
  KIS_ACCOUNT_PRODUCT_CODE: "01",
  KIWOOM_APP_KEY: "test-key",
  KIWOOM_SECRET_KEY: "test-secret",
  KIWOOM_ENV: "dev",
  BROKER_TOKEN_KIWOOM: "kiwoom-token",
  cluefin_fsd_db: {
    prepare: () => ({
      bind: () => ({ first: () => Promise.resolve(null), run: () => Promise.resolve() }),
    }),
  },
};

const mockCtx = { waitUntil: mock(), passThroughOnException: mock() };

function req(method: string, path: string) {
  return new Request(`http://localhost${path}`, { method });
}

describe("GET /unknown", () => {
  test("존재하지 않는 라우트 → 404", async () => {
    const res = await worker.fetch(req("GET", "/unknown"), mockEnv, mockCtx);
    expect(res.status).toBe(404);
  });
});
