import type { KisIntradayChartOutput2, KisStockPriceOutput } from "@cluefin/securities";

export const LOSS_CUT_PCT = 5;
export const TAKE_PROFIT_PCT = 15;
export const MA_SHORT = 5;
export const MA_LONG = 20;

export function computeMA(candles: KisIntradayChartOutput2[], period: number): number | null {
  if (candles.length < period) return null;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += Number(candles[i].stckPrpr);
  }
  return sum / period;
}

export function evaluateBuyCondition(
  currentPrice: number,
  candles: KisIntradayChartOutput2[],
  stockInfo: KisStockPriceOutput,
): { shouldBuy: boolean; reason: string } {
  const ma5 = computeMA(candles, MA_SHORT);
  const ma20 = computeMA(candles, MA_LONG);

  if (ma5 === null || ma20 === null) {
    return { shouldBuy: false, reason: "분봉 데이터 부족" };
  }

  if (ma5 <= ma20) {
    return { shouldBuy: false, reason: `단기MA(${ma5}) <= 장기MA(${ma20}), 상승추세 아님` };
  }

  if (currentPrice <= ma5) {
    return { shouldBuy: false, reason: `현재가(${currentPrice}) <= 5MA(${ma5}), 추세 아래` };
  }

  const lowRate = Number(stockInfo.d250LwprVrssPrprRate);
  if (lowRate <= 10) {
    return {
      shouldBuy: false,
      reason: `250일 저점 대비 괴리율(${lowRate}%)이 10% 이내, 저점 부근 진입 회피`,
    };
  }

  const volTnrt = Number(stockInfo.volTnrt);
  if (volTnrt <= 0) {
    return { shouldBuy: false, reason: `거래량 회전율(${volTnrt}) <= 0, 유동성 부족` };
  }

  return {
    shouldBuy: true,
    reason: `상승추세 확인: 5MA(${ma5}) > 20MA(${ma20}), 현재가(${currentPrice}) > 5MA`,
  };
}

export function evaluateSellCondition(
  currentPrice: number,
  referencePrice: number,
  peakPrice: number,
  trailingStopPct: number,
): { shouldSell: boolean; reason: string } {
  const lossCutPrice = referencePrice * (1 - LOSS_CUT_PCT / 100);
  if (currentPrice <= lossCutPrice) {
    return {
      shouldSell: true,
      reason: `손절: 현재가(${currentPrice}) <= 기준가(${referencePrice}) * ${1 - LOSS_CUT_PCT / 100}`,
    };
  }

  const takeProfitPrice = referencePrice * (1 + TAKE_PROFIT_PCT / 100);
  if (currentPrice >= takeProfitPrice) {
    return {
      shouldSell: true,
      reason: `익절: 현재가(${currentPrice}) >= 기준가(${referencePrice}) * ${1 + TAKE_PROFIT_PCT / 100}`,
    };
  }

  const trailingStopPrice = peakPrice * (1 - trailingStopPct / 100);
  if (currentPrice <= trailingStopPrice) {
    return {
      shouldSell: true,
      reason: `트레일링 스탑: 현재가(${currentPrice}) <= 고점(${peakPrice}) * ${1 - trailingStopPct / 100}`,
    };
  }

  return { shouldSell: false, reason: "매도 조건 미충족" };
}

export function updatePeakPrice(currentPeak: number | null, currentPrice: number): number {
  if (currentPeak === null) return currentPrice;
  return Math.max(currentPeak, currentPrice);
}
