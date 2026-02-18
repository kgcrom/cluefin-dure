import type { ScheduledEvent } from "@cloudflare/workers-types";
import type { ExecutionStatus, TradeExecution, TradeOrder } from "@cluefin/cloudflare";
import { createOrderRepository } from "@cluefin/cloudflare";
import {
  type BrokerEnv,
  createKisMarketClient,
  createKisOrderClient,
  type KisDailyOrderParams,
  type KisIntradayChartResponse,
  type KisStockPriceResponse,
} from "@cluefin/securities";
import type { Env } from "./bindings";
import { evaluateBuyCondition, evaluateSellCondition, updatePeakPrice } from "./strategy";
import { getTodayKst, isFillCheckTime, isOrderExecutionTime } from "./time-utils";
import { getBrokerToken, refreshBrokerToken } from "./token-store";

const TOKEN_REFRESH_CRON = "0 */6 * * *";

async function executeKisOrder(
  env: Env,
  order: TradeOrder,
  quantity: number,
  kisToken: string,
  orderType: string = "00",
): Promise<{ brokerOrderId: string; brokerResponse: string }> {
  const kisEnv = env.KIS_ENV as BrokerEnv;
  const credentials = { appkey: env.KIS_APP_KEY, appsecret: env.KIS_SECRET_KEY };
  const client = createKisOrderClient(kisEnv);

  const params = {
    accountNo: env.KIS_ACCOUNT_NO,
    accountProductCode: env.KIS_ACCOUNT_PRODUCT_CODE,
    stockCode: order.stockCode,
    orderType,
    quantity: String(quantity),
    price: orderType === "01" ? "0" : String(order.referencePrice),
  };

  const result =
    order.side === "buy"
      ? await client.buyOrder(credentials, kisToken, params)
      : await client.sellOrder(credentials, kisToken, params);

  return {
    brokerOrderId: result.output.odno,
    brokerResponse: JSON.stringify(result),
  };
}

function getCurrentKstHour(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const h = String(kst.getUTCHours()).padStart(2, "0");
  const m = String(kst.getUTCMinutes()).padStart(2, "0");
  const s = String(kst.getUTCSeconds()).padStart(2, "0");
  return `${h}${m}${s}`;
}

export async function handleOrderExecution(env: Env): Promise<void> {
  const repo = createOrderRepository(env.cluefin_fsd_db);
  const orders = await repo.getActiveOrders();

  console.log(`[cron] 활성 주문 ${orders.length}건 조회`);

  const kisToken = await getBrokerToken(env, "kis");

  const kisEnv = env.KIS_ENV as BrokerEnv;
  const marketClient = createKisMarketClient(kisEnv);
  const credentials = { appkey: env.KIS_APP_KEY, appsecret: env.KIS_SECRET_KEY };

  let processedCount = 0;

  for (const order of orders) {
    try {
      console.log(
        `[cron] 주문 처리 시작: order_id=${order.id}, broker=${order.broker}, stock=${order.stockCode}, side=${order.side}`,
      );

      if (!kisToken) throw new Error("KIS 토큰이 설정되지 않았습니다");

      const stockPrice: KisStockPriceResponse = await marketClient.getStockPrice(
        credentials,
        kisToken,
        { marketCode: "J", stockCode: order.stockCode },
      );
      const intradayChart: KisIntradayChartResponse = await marketClient.getIntradayChart(
        credentials,
        kisToken,
        {
          marketCode: "J",
          stockCode: order.stockCode,
          inputHour: getCurrentKstHour(),
          includePrevData: "N",
          etcClassCode: "",
        },
      );

      const currentPrice = Number(stockPrice.output.stckPrpr);
      console.log(
        `[cron] 시세 조회: stock=${order.stockCode}, 현재가=${currentPrice}, 분봉=${intradayChart.output2.length}건`,
      );

      // 매수 주문 + monitoring 상태: 매도 조건 우선 확인
      if (order.side === "buy" && order.status === "monitoring") {
        const newPeak = updatePeakPrice(order.peakPrice, currentPrice);
        await repo.updatePeakPrice(order.id, newPeak);

        const sellResult = evaluateSellCondition(
          currentPrice,
          order.referencePrice,
          newPeak,
          order.trailingStopPct,
        );

        if (sellResult.shouldSell) {
          console.log(`[cron] 자동 매도 트리거: order_id=${order.id}, reason=${sellResult.reason}`);

          const filledQty = await repo.getFilledQuantityForOrder(order.id);
          if (filledQty > 0) {
            const sellOrder = { ...order, side: "sell" as const, referencePrice: currentPrice };
            const sellOrderType = sellResult.type === "loss_cut" ? "01" : "00";
            const { brokerOrderId, brokerResponse } = await executeKisOrder(
              env,
              sellOrder,
              filledQty,
              kisToken,
              sellOrderType,
            );
            await repo.createExecution({
              orderId: order.id,
              brokerOrderId,
              requestedQty: filledQty,
              requestedPrice: currentPrice,
              broker: order.broker,
              brokerResponse,
            });
            console.log(
              `[cron] 매도 즉시 실행: stock=${order.stockCode}, qty=${filledQty}, price=${currentPrice}, brokerOrderId=${brokerOrderId}`,
            );
          }

          await repo.updateOrderStatus(order.id, "executed");
          processedCount++;
          continue;
        }
      }

      // 매수 주문: 매수 조건 확인
      if (order.side === "buy") {
        const buyResult = evaluateBuyCondition(
          currentPrice,
          intradayChart.output2,
          stockPrice.output,
        );

        if (!buyResult.shouldBuy) {
          console.log(`[cron] 매수 조건 미충족: order_id=${order.id}, reason=${buyResult.reason}`);
          continue;
        }
        console.log(`[cron] 매수 조건 충족: order_id=${order.id}, reason=${buyResult.reason}`);
      }

      // 잔여수량 확인 및 주문 실행
      const requestedQty = await repo.getRequestedQuantity(order.id);
      const remaining = order.quantity - requestedQty;

      if (remaining <= 0) {
        console.log(
          `[cron] 주문 건너뜀: order_id=${order.id}, 사유=잔여수량 없음 (total=${order.quantity}, requested=${requestedQty})`,
        );
        continue;
      }

      let quantity: number;
      if (order.side === "buy") {
        const maxQty = Math.floor(300000 / order.referencePrice);
        quantity = Math.min(remaining, maxQty);
      } else {
        quantity = remaining === 1 ? 1 : Math.floor(remaining / 2);
      }

      // 한주당 30만원이 넘는 주식을 매수하는 경우 발생
      if (quantity <= 0) {
        console.log(
          `[cron] 주문 건너뜀: order_id=${order.id}, 사유=분할수량 0 (referencePrice=${order.referencePrice})`,
        );
        continue;
      }

      console.log(
        `[cron] 분할 수량 계산: order_id=${order.id}, total=${order.quantity}, requested=${requestedQty}, remaining=${remaining}, thisRound=${quantity}`,
      );

      const { brokerOrderId, brokerResponse } = await executeKisOrder(
        env,
        order,
        quantity,
        kisToken,
      );

      await repo.createExecution({
        orderId: order.id,
        brokerOrderId,
        requestedQty: quantity,
        requestedPrice: order.referencePrice,
        broker: order.broker,
        brokerResponse,
      });

      console.log(
        `[cron] 주문 실행 성공: order_id=${order.id}, brokerOrderId=${brokerOrderId}, quantity=${quantity}`,
      );
      processedCount++;

      if (order.status === "pending") {
        await repo.updateOrderStatus(order.id, "monitoring");
      }
    } catch (e) {
      console.error(
        `[cron] 주문 실행 실패 (order_id=${order.id}):`,
        e instanceof Error ? e.message : e,
      );
    }
  }

  console.log(`[cron] 주문 실행 완료: ${processedCount}/${orders.length}건 처리`);
}

async function checkKisFills(env: Env, executions: TradeExecution[]): Promise<void> {
  if (executions.length === 0) return;

  console.log(`[fillCheck] KIS 체결 확인 시작: ${executions.length}건`);

  const token = await getBrokerToken(env, "kis");
  if (!token) throw new Error("KIS 토큰이 설정되지 않았습니다");

  const kisEnv = env.KIS_ENV as BrokerEnv;
  const credentials = { appkey: env.KIS_APP_KEY, appsecret: env.KIS_SECRET_KEY };
  const client = createKisOrderClient(kisEnv);
  const repo = createOrderRepository(env.cluefin_fsd_db);

  const today = getTodayKst();
  const params: KisDailyOrderParams = {
    accountNo: env.KIS_ACCOUNT_NO,
    accountProductCode: env.KIS_ACCOUNT_PRODUCT_CODE,
    startDate: today,
    endDate: today,
  };

  const response = await client.getDailyOrders(credentials, token, params);

  // Map: broker_order_id -> order data
  const orderMap = new Map(response.output1.map((order) => [order.odno, order]));

  for (const execution of executions) {
    const orderData = orderMap.get(execution.brokerOrderId);

    if (!orderData) {
      console.warn(`[fillCheck] KIS order not found: ${execution.brokerOrderId}`);
      continue;
    }

    const filledQty = Number(orderData.totCcldQty);
    const filledPrice = Number(orderData.avgPrvs);
    const rejectedQty = Number(orderData.rjctQty);

    let status: ExecutionStatus;
    if (rejectedQty > 0 && filledQty === 0) {
      status = "rejected";
    } else if (filledQty === 0) {
      continue; // Still unfilled
    } else if (filledQty < execution.requestedQty) {
      status = "partial";
    } else {
      status = "filled";
    }

    console.log(
      `[fillCheck] KIS 체결 업데이트: execution_id=${execution.id}, status=${status}, filledQty=${filledQty}`,
    );
    await repo.updateExecutionFill(execution.id, filledQty, filledPrice, status);
  }
}

export async function handleFillCheck(env: Env): Promise<void> {
  const repo = createOrderRepository(env.cluefin_fsd_db);
  const executions = await repo.getUnfilledExecutions();

  console.log(`[cron] 체결 확인: ${executions.length}개 미체결 주문`);

  if (executions.length === 0) {
    console.log("[cron] 체결 확인 완료: 미체결 주문 없음, 스킵");
    return;
  }

  await checkKisFills(env, executions);

  console.log("[cron] 체결 확인 완료");
}

export async function handleScheduled(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext,
): Promise<void> {
  const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const runOrder = isOrderExecutionTime();
  const runFill = isFillCheckTime();

  console.log(`[cron] 스케줄 트리거: ${now}, 주문실행=${runOrder}, 체결확인=${runFill}`);

  if (event.cron === TOKEN_REFRESH_CRON) {
    console.log("[cron] 토큰 갱신 시작");
    ctx.waitUntil(
      refreshBrokerToken(env, "kis")
        .then(() => console.log("[cron] 토큰 갱신 완료"))
        .catch((e) => console.error("[cron] 토큰 갱신 실패:", String(e))),
    );
  }

  if (runOrder) {
    console.log("[cron] 주문 실행 시작");
    ctx.waitUntil(handleOrderExecution(env));
  }

  if (runFill) {
    console.log("[cron] 체결 확인 시작");
    ctx.waitUntil(handleFillCheck(env));
  }
}
