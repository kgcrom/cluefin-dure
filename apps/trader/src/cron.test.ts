import { afterEach, describe, expect, mock, test } from "bun:test";
import type { KisIntradayChartOutput2 } from "@cluefin/securities";

const mockGetActiveOrders = mock(() => Promise.resolve([]));
const mockGetRequestedQuantity = mock(() => Promise.resolve(0));
const mockCreateExecution = mock(() => Promise.resolve({}));
const mockUpdateOrderStatus = mock(() => Promise.resolve());
const mockGetUnfilledExecutions = mock(() => Promise.resolve([]));
const mockUpdateExecutionFill = mock(() => Promise.resolve());
const mockUpdatePeakPrice = mock(() => Promise.resolve());
const mockGetFilledQuantityForOrder = mock(() => Promise.resolve(0));
const mockCreateOrder = mock(() => Promise.resolve({}));
const mockBuyOrder = mock(() => Promise.resolve({ output: { odno: "001", ordTmd: "121000" } }));
const mockSellOrder = mock(() => Promise.resolve({ output: { odno: "002", ordTmd: "121001" } }));
const mockGetDailyOrdersKis = mock(() =>
  Promise.resolve({
    rtCd: "0",
    msgCd: "MCA00000",
    msg1: "성공",
    output1: [],
    output2: {},
  }),
);

const mockGetStockPrice = mock(() => Promise.resolve({ output: makeBullishStockInfo("66000") }));
const mockGetIntradayChart = mock(() =>
  Promise.resolve({
    rtCd: "0",
    msgCd: "MCA00000",
    msg1: "성공",
    output1: {},
    output2: makeBullishCandles(),
  }),
);

mock.module("@cluefin/cloudflare", () => ({
  createOrderRepository: () => ({
    getActiveOrders: mockGetActiveOrders,
    getRequestedQuantity: mockGetRequestedQuantity,
    createExecution: mockCreateExecution,
    updateOrderStatus: mockUpdateOrderStatus,
    getUnfilledExecutions: mockGetUnfilledExecutions,
    updateExecutionFill: mockUpdateExecutionFill,
    updatePeakPrice: mockUpdatePeakPrice,
    getFilledQuantityForOrder: mockGetFilledQuantityForOrder,
    createOrder: mockCreateOrder,
  }),
}));

mock.module("@cluefin/securities", () => ({
  createKisAuthClient: () => ({
    getToken: mock(),
  }),
  createKisMarketClient: () => ({
    getStockPrice: mockGetStockPrice,
    getIntradayChart: mockGetIntradayChart,
  }),
  createKisOrderClient: () => ({
    buyOrder: mockBuyOrder,
    sellOrder: mockSellOrder,
    getDailyOrders: mockGetDailyOrdersKis,
  }),
}));

const { handleOrderExecution, handleFillCheck } = await import("./cron");

function makeCandle(price: number): KisIntradayChartOutput2 {
  return {
    stckBsopDate: "20260218",
    stckCntgHour: "100000",
    stckPrpr: String(price),
    stckOprc: String(price),
    stckHgpr: String(price),
    stckLwpr: String(price),
    cntgVol: "100",
    acmlTrPbmn: "1000000",
  };
}

function makeBullishCandles(): KisIntradayChartOutput2[] {
  const candles: KisIntradayChartOutput2[] = [];
  // 최근 5봉: 높은 가격 → 5MA = 70000
  for (let i = 0; i < 5; i++) candles.push(makeCandle(70000));
  // 나머지 15봉: 낮은 가격 → 20MA = (70000*5 + 60000*15)/20 = 62500
  for (let i = 0; i < 15; i++) candles.push(makeCandle(60000));
  return candles;
}

function makeBearishCandles(): KisIntradayChartOutput2[] {
  const candles: KisIntradayChartOutput2[] = [];
  // 최근 5봉: 낮은 가격
  for (let i = 0; i < 5; i++) candles.push(makeCandle(50000));
  // 나머지 15봉: 높은 가격
  for (let i = 0; i < 15; i++) candles.push(makeCandle(70000));
  return candles;
}

function makeBullishStockInfo(currentPrice: string) {
  return {
    stckPrpr: currentPrice,
    d250LwprVrssPrprRate: "32.00",
    volTnrt: "0.50",
  };
}

function createMockD1() {
  const futureDate = new Date(Date.now() + 86_400_000).toISOString();
  const tokenRows: Record<string, unknown> = {
    kis: {
      broker: "kis",
      token: "kis-token",
      token_type: "Bearer",
      expires_at: futureDate,
      updated_at: new Date().toISOString(),
    },
  };
  return {
    prepare: () => ({
      bind: (...args: unknown[]) => ({
        first: () => Promise.resolve(tokenRows[args[0] as string] ?? null),
        run: () => Promise.resolve(),
      }),
    }),
  };
}

const mockEnv = {
  KIS_APP_KEY: "test-key",
  KIS_SECRET_KEY: "test-secret",
  KIS_ENV: "dev",
  KIS_ACCOUNT_NO: "12345",
  KIS_ACCOUNT_PRODUCT_CODE: "01",
  cluefin_fsd_db: createMockD1(),
};

afterEach(() => {
  mockGetActiveOrders.mockClear();
  mockGetRequestedQuantity.mockClear();
  mockCreateExecution.mockClear();
  mockUpdateOrderStatus.mockClear();
  mockGetUnfilledExecutions.mockClear();
  mockUpdateExecutionFill.mockClear();
  mockUpdatePeakPrice.mockClear();
  mockGetFilledQuantityForOrder.mockClear();
  mockCreateOrder.mockClear();
  mockBuyOrder.mockClear();
  mockSellOrder.mockClear();
  mockGetDailyOrdersKis.mockClear();
  mockGetStockPrice.mockClear();
  mockGetIntradayChart.mockClear();
});

describe("handleOrderExecution", () => {
  test("매수 조건 미충족 시 주문 스킵", async () => {
    mockGetActiveOrders.mockResolvedValueOnce([
      {
        id: 1,
        stockCode: "005930",
        side: "buy",
        referencePrice: 66000,
        quantity: 10,
        broker: "kis",
        status: "pending",
        trailingStopPct: 5,
        peakPrice: null,
      },
    ]);
    // 하락추세 분봉 데이터
    mockGetIntradayChart.mockResolvedValueOnce({
      rtCd: "0",
      msgCd: "MCA00000",
      msg1: "성공",
      output1: {},
      output2: makeBearishCandles(),
    });
    mockGetStockPrice.mockResolvedValueOnce({
      output: makeBullishStockInfo("66000"),
    });

    await handleOrderExecution(mockEnv);

    expect(mockBuyOrder).not.toHaveBeenCalled();
    expect(mockCreateExecution).not.toHaveBeenCalled();
  });

  test("잔여수량 0이면 주문 안 함", async () => {
    mockGetActiveOrders.mockResolvedValueOnce([
      {
        id: 1,
        stockCode: "005930",
        side: "buy",
        referencePrice: 66000,
        quantity: 10,
        broker: "kis",
        status: "monitoring",
        trailingStopPct: 5,
        peakPrice: 66000,
      },
    ]);
    // 매도 조건 미충족 + 매수 조건 충족되도록 현재가 > 5MA(70000)
    mockGetStockPrice.mockResolvedValueOnce({
      output: makeBullishStockInfo("75000"),
    });
    mockGetIntradayChart.mockResolvedValueOnce({
      rtCd: "0",
      msgCd: "MCA00000",
      msg1: "성공",
      output1: {},
      output2: makeBullishCandles(),
    });
    mockGetRequestedQuantity.mockResolvedValueOnce(10);

    await handleOrderExecution(mockEnv);

    expect(mockBuyOrder).not.toHaveBeenCalled();
    expect(mockCreateExecution).not.toHaveBeenCalled();
  });

  test("pending 상태 매수 조건 충족 시 주문 실행 후 monitoring 전환", async () => {
    mockGetActiveOrders.mockResolvedValueOnce([
      {
        id: 2,
        stockCode: "005930",
        side: "buy",
        referencePrice: 66000,
        quantity: 10,
        broker: "kis",
        status: "pending",
        trailingStopPct: 5,
        peakPrice: null,
        market: "kospi",
      },
    ]);
    // 상승추세: 5MA=70000, 20MA=62500, 현재가=75000 > 5MA
    mockGetStockPrice.mockResolvedValueOnce({
      output: makeBullishStockInfo("75000"),
    });
    mockGetIntradayChart.mockResolvedValueOnce({
      rtCd: "0",
      msgCd: "MCA00000",
      msg1: "성공",
      output1: {},
      output2: makeBullishCandles(),
    });
    mockGetRequestedQuantity.mockResolvedValueOnce(0);

    await handleOrderExecution(mockEnv);

    expect(mockBuyOrder).toHaveBeenCalledTimes(1);
    expect(mockCreateExecution).toHaveBeenCalledTimes(1);
    expect(mockUpdateOrderStatus).toHaveBeenCalledWith(2, "monitoring");
  });

  test("손절 트리거 시 시장가 전량 매도 실행", async () => {
    mockGetActiveOrders.mockResolvedValueOnce([
      {
        id: 3,
        stockCode: "005930",
        side: "buy",
        referencePrice: 100000,
        quantity: 10,
        broker: "kis",
        status: "monitoring",
        trailingStopPct: 5,
        peakPrice: 105000,
        market: "kospi",
        stockName: "삼성전자",
      },
    ]);
    // 현재가 = 95000 → 기준가 100000의 95% → 손절
    mockGetStockPrice.mockResolvedValueOnce({
      output: makeBullishStockInfo("95000"),
    });
    mockGetIntradayChart.mockResolvedValueOnce({
      rtCd: "0",
      msgCd: "MCA00000",
      msg1: "성공",
      output1: {},
      output2: makeBullishCandles(),
    });
    mockGetFilledQuantityForOrder.mockResolvedValueOnce(5);

    await handleOrderExecution(mockEnv);

    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(mockSellOrder).toHaveBeenCalledTimes(1);
    // 손절은 시장가("01")로 주문, price="0"
    const sellParams = mockSellOrder.mock.calls[0];
    expect(sellParams[2]).toMatchObject({
      orderType: "01",
      price: "0",
    });
    expect(mockCreateExecution).toHaveBeenCalledTimes(1);
    expect(mockCreateExecution.mock.calls[0][0]).toMatchObject({
      orderId: 3,
      brokerOrderId: "002",
      requestedQty: 5,
      requestedPrice: 95000,
    });
    expect(mockUpdateOrderStatus).toHaveBeenCalledWith(3, "executed");
    // 매수 주문은 실행되지 않아야 함
    expect(mockBuyOrder).not.toHaveBeenCalled();
  });

  test("익절 트리거 시 지정가 매도 실행", async () => {
    mockGetActiveOrders.mockResolvedValueOnce([
      {
        id: 4,
        stockCode: "005930",
        side: "buy",
        referencePrice: 100000,
        quantity: 10,
        broker: "kis",
        status: "monitoring",
        trailingStopPct: 5,
        peakPrice: 115000,
        market: "kospi",
        stockName: "삼성전자",
      },
    ]);
    // 현재가 = 115000 → 기준가 100000의 115% → 익절
    mockGetStockPrice.mockResolvedValueOnce({
      output: makeBullishStockInfo("115000"),
    });
    mockGetIntradayChart.mockResolvedValueOnce({
      rtCd: "0",
      msgCd: "MCA00000",
      msg1: "성공",
      output1: {},
      output2: makeBullishCandles(),
    });
    mockGetFilledQuantityForOrder.mockResolvedValueOnce(8);

    await handleOrderExecution(mockEnv);

    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(mockSellOrder).toHaveBeenCalledTimes(1);
    // 익절은 지정가("00")로 주문
    const sellParams = mockSellOrder.mock.calls[0];
    expect(sellParams[2]).toMatchObject({
      orderType: "00",
    });
    expect(mockCreateExecution).toHaveBeenCalledTimes(1);
    expect(mockCreateExecution.mock.calls[0][0]).toMatchObject({
      orderId: 4,
      brokerOrderId: "002",
      requestedQty: 8,
      requestedPrice: 115000,
    });
    expect(mockUpdateOrderStatus).toHaveBeenCalledWith(4, "executed");
  });

  test("트레일링 스탑 트리거 시 지정가 매도 실행", async () => {
    mockGetActiveOrders.mockResolvedValueOnce([
      {
        id: 5,
        stockCode: "005930",
        side: "buy",
        referencePrice: 100000,
        quantity: 10,
        broker: "kis",
        status: "monitoring",
        trailingStopPct: 5,
        peakPrice: 110000,
        market: "kospi",
        stockName: "삼성전자",
      },
    ]);
    // 현재가 = 104500 → 고점 110000 * 0.95 = 104500 → 트레일링 스탑
    mockGetStockPrice.mockResolvedValueOnce({
      output: makeBullishStockInfo("104500"),
    });
    mockGetIntradayChart.mockResolvedValueOnce({
      rtCd: "0",
      msgCd: "MCA00000",
      msg1: "성공",
      output1: {},
      output2: makeBullishCandles(),
    });
    mockGetFilledQuantityForOrder.mockResolvedValueOnce(3);

    await handleOrderExecution(mockEnv);

    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(mockSellOrder).toHaveBeenCalledTimes(1);
    // 트레일링 스탑은 지정가("00")로 주문
    const sellParams = mockSellOrder.mock.calls[0];
    expect(sellParams[2]).toMatchObject({
      orderType: "00",
    });
    expect(mockCreateExecution).toHaveBeenCalledTimes(1);
    expect(mockCreateExecution.mock.calls[0][0]).toMatchObject({
      orderId: 5,
      brokerOrderId: "002",
      requestedQty: 3,
      requestedPrice: 104500,
    });
    expect(mockUpdateOrderStatus).toHaveBeenCalledWith(5, "executed");
  });

  test("sell 주문은 조건 없이 즉시 실행", async () => {
    mockGetActiveOrders.mockResolvedValueOnce([
      {
        id: 6,
        stockCode: "005930",
        side: "sell",
        referencePrice: 66000,
        quantity: 10,
        broker: "kis",
        status: "pending",
        trailingStopPct: 0,
        peakPrice: null,
        market: "kospi",
      },
    ]);
    mockGetStockPrice.mockResolvedValueOnce({
      output: makeBullishStockInfo("66000"),
    });
    mockGetIntradayChart.mockResolvedValueOnce({
      rtCd: "0",
      msgCd: "MCA00000",
      msg1: "성공",
      output1: {},
      output2: makeBearishCandles(),
    });
    mockGetRequestedQuantity.mockResolvedValueOnce(0);

    await handleOrderExecution(mockEnv);

    expect(mockSellOrder).toHaveBeenCalledTimes(1);
    expect(mockCreateExecution).toHaveBeenCalledTimes(1);
  });
});

describe("handleFillCheck", () => {
  test("빈 미체결 목록이면 조기 반환", async () => {
    mockGetUnfilledExecutions.mockResolvedValueOnce([]);

    await handleFillCheck(mockEnv);

    expect(mockGetDailyOrdersKis).not.toHaveBeenCalled();
  });

  test("KIS 완전체결 주문", async () => {
    mockGetUnfilledExecutions.mockResolvedValueOnce([
      {
        id: 1,
        orderId: 10,
        brokerOrderId: "KIS001",
        requestedQty: 10,
        requestedPrice: 50000,
        broker: "kis",
        status: "ordered",
        createdAt: new Date(),
      },
    ]);

    mockGetDailyOrdersKis.mockResolvedValueOnce({
      rtCd: "0",
      msgCd: "MCA00000",
      msg1: "성공",
      output1: [
        {
          odno: "KIS001",
          totCcldQty: "10",
          avgPrvs: "50000",
          rjctQty: "0",
        },
      ],
      output2: {},
    });

    await handleFillCheck(mockEnv);

    expect(mockUpdateExecutionFill).toHaveBeenCalledWith(1, 10, 50000, "filled");
  });

  test("KIS 부분체결 주문", async () => {
    mockGetUnfilledExecutions.mockResolvedValueOnce([
      {
        id: 2,
        orderId: 20,
        brokerOrderId: "KIS002",
        requestedQty: 10,
        requestedPrice: 50000,
        broker: "kis",
        status: "ordered",
        createdAt: new Date(),
      },
    ]);

    mockGetDailyOrdersKis.mockResolvedValueOnce({
      rtCd: "0",
      msgCd: "MCA00000",
      msg1: "성공",
      output1: [
        {
          odno: "KIS002",
          totCcldQty: "5",
          avgPrvs: "50000",
          rjctQty: "0",
        },
      ],
      output2: {},
    });

    await handleFillCheck(mockEnv);

    expect(mockUpdateExecutionFill).toHaveBeenCalledWith(2, 5, 50000, "partial");
  });

  test("KIS 거부 주문", async () => {
    mockGetUnfilledExecutions.mockResolvedValueOnce([
      {
        id: 3,
        orderId: 30,
        brokerOrderId: "KIS003",
        requestedQty: 10,
        requestedPrice: 50000,
        broker: "kis",
        status: "ordered",
        createdAt: new Date(),
      },
    ]);

    mockGetDailyOrdersKis.mockResolvedValueOnce({
      rtCd: "0",
      msgCd: "MCA00000",
      msg1: "성공",
      output1: [
        {
          odno: "KIS003",
          totCcldQty: "0",
          avgPrvs: "0",
          rjctQty: "10",
        },
      ],
      output2: {},
    });

    await handleFillCheck(mockEnv);

    expect(mockUpdateExecutionFill).toHaveBeenCalledWith(3, 0, 0, "rejected");
  });

  test("API에 주문이 없으면 경고만 출력", async () => {
    mockGetUnfilledExecutions.mockResolvedValueOnce([
      {
        id: 6,
        orderId: 60,
        brokerOrderId: "KIS999",
        requestedQty: 10,
        requestedPrice: 50000,
        broker: "kis",
        status: "ordered",
        createdAt: new Date(),
      },
    ]);

    mockGetDailyOrdersKis.mockResolvedValueOnce({
      rtCd: "0",
      msgCd: "MCA00000",
      msg1: "성공",
      output1: [],
      output2: {},
    });

    await handleFillCheck(mockEnv);

    expect(mockUpdateExecutionFill).not.toHaveBeenCalled();
  });

  test("여러 KIS 주문 혼합 처리", async () => {
    mockGetUnfilledExecutions.mockResolvedValueOnce([
      {
        id: 7,
        orderId: 70,
        brokerOrderId: "KIS100",
        requestedQty: 10,
        requestedPrice: 50000,
        broker: "kis",
        status: "ordered",
        createdAt: new Date(),
      },
      {
        id: 8,
        orderId: 80,
        brokerOrderId: "KIS200",
        requestedQty: 5,
        requestedPrice: 60000,
        broker: "kis",
        status: "ordered",
        createdAt: new Date(),
      },
    ]);

    mockGetDailyOrdersKis.mockResolvedValueOnce({
      rtCd: "0",
      msgCd: "MCA00000",
      msg1: "성공",
      output1: [
        { odno: "KIS100", totCcldQty: "10", avgPrvs: "50000", rjctQty: "0" },
        { odno: "KIS200", totCcldQty: "5", avgPrvs: "60000", rjctQty: "0" },
      ],
      output2: {},
    });

    await handleFillCheck(mockEnv);

    expect(mockUpdateExecutionFill).toHaveBeenCalledTimes(2);
    expect(mockUpdateExecutionFill).toHaveBeenCalledWith(7, 10, 50000, "filled");
    expect(mockUpdateExecutionFill).toHaveBeenCalledWith(8, 5, 60000, "filled");
  });

  test("KIS 실패하면 에러 발생", async () => {
    mockGetUnfilledExecutions.mockResolvedValueOnce([
      {
        id: 12,
        orderId: 120,
        brokerOrderId: "KIS400",
        requestedQty: 10,
        requestedPrice: 50000,
        broker: "kis",
        status: "ordered",
        createdAt: new Date(),
      },
    ]);

    mockGetDailyOrdersKis.mockRejectedValueOnce(new Error("KIS API error"));

    await expect(handleFillCheck(mockEnv)).rejects.toThrow("KIS API error");

    expect(mockUpdateExecutionFill).not.toHaveBeenCalled();
  });
});
