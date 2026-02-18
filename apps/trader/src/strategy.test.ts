import { describe, expect, test } from "bun:test";
import type { KisIntradayChartOutput2, KisStockPriceOutput } from "@cluefin/securities";
import {
  computeMA,
  evaluateBuyCondition,
  evaluateSellCondition,
  updatePeakPrice,
} from "./strategy";

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

function makeStockInfo(overrides: Partial<KisStockPriceOutput> = {}): KisStockPriceOutput {
  return {
    iscdStatClsCode: "00",
    margRate: "20",
    rprsMrktKorName: "KOSPI",
    newHgprLwprClsCode: "",
    bstpKorIsnm: "전기전자",
    tempStopYn: "N",
    oprcRangContYn: "N",
    clprRangContYn: "N",
    crdtAbleYn: "Y",
    grmnRateClsCode: "00",
    elwPblcYn: "N",
    stckPrpr: "66000",
    prdyVrss: "1000",
    prdyVrssSign: "2",
    prdyCtrt: "1.54",
    acmlTrPbmn: "500000000",
    acmlVol: "7500",
    prdyVrssVolRate: "120",
    stckOprc: "65000",
    stckHgpr: "67000",
    stckLwpr: "64000",
    stckMxpr: "84500",
    stckLlam: "45500",
    stckSdpr: "65000",
    wghnAvrgStckPrc: "65500",
    htsFrgnEhrt: "55.00",
    frgnNtbyQty: "100",
    pgtrNtbyQty: "50",
    pvtScndDmrsPrc: "68000",
    pvtFrstDmrsPrc: "67000",
    pvtPontVal: "66000",
    pvtFrstDmspPrc: "65000",
    pvtScndDmspPrc: "64000",
    dmrsVal: "67500",
    dmspVal: "64500",
    cpfn: "897",
    rstcWdthPrc: "0",
    stckFcam: "5000",
    stckSspr: "65000",
    asprUnit: "100",
    htsDealQtyUnitVal: "1",
    lstnStcn: "5969782550",
    htsAvls: "394000",
    per: "12.50",
    pbr: "1.20",
    stacMonth: "12",
    volTnrt: "0.50",
    eps: "5280",
    bps: "55000",
    d250Hgpr: "80000",
    d250HgprDate: "20251001",
    d250HgprVrssPrprRate: "-17.50",
    d250Lwpr: "50000",
    d250LwprDate: "20250501",
    d250LwprVrssPrprRate: "32.00",
    stckDryyHgpr: "80000",
    dryyHgprVrssPrprRate: "-17.50",
    dryyHgprDate: "20251001",
    stckDryyLwpr: "50000",
    dryyLwprVrssPrprRate: "32.00",
    dryyLwprDate: "20250501",
    w52Hgpr: "80000",
    w52HgprVrssPrprCtrt: "-17.50",
    w52HgprDate: "20251001",
    w52Lwpr: "50000",
    w52LwprVrssPrprCtrt: "32.00",
    w52LwprDate: "20250501",
    wholLoanRmndRate: "0",
    sstsYn: "N",
    stckShrnIscd: "005930",
    fcamCnnm: "원",
    cpfnCnnm: "억",
    apprchRate: "0",
    frgnHldnQty: "3200000000",
    viClsCode: "N",
    ovtmViClsCode: "N",
    lastSstsCntgQty: "0",
    invtCafulYn: "N",
    mrktWarnClsCode: "00",
    shortOverYn: "N",
    sltrYn: "N",
    mangIssuClsCode: "00",
    ...overrides,
  };
}

describe("computeMA", () => {
  test("데이터 부족 시 null 반환", () => {
    const candles = [makeCandle(100), makeCandle(200)];
    expect(computeMA(candles, 5)).toBeNull();
  });

  test("정상 이동평균 계산", () => {
    const candles = [
      makeCandle(110),
      makeCandle(120),
      makeCandle(100),
      makeCandle(90),
      makeCandle(80),
    ];
    // (110 + 120 + 100 + 90 + 80) / 5 = 100
    expect(computeMA(candles, 5)).toBe(100);
  });

  test("period보다 많은 데이터가 있으면 앞쪽 period개만 사용", () => {
    const candles = [
      makeCandle(200),
      makeCandle(100),
      makeCandle(100),
      makeCandle(100),
      makeCandle(100),
      makeCandle(50), // 이 데이터는 사용되지 않음
    ];
    expect(computeMA(candles, 5)).toBe(120);
  });
});

describe("evaluateBuyCondition", () => {
  test("상승추세에서 매수 조건 충족", () => {
    // 5MA > 20MA이고, 현재가 > 5MA
    const candles: KisIntradayChartOutput2[] = [];
    // 최근 5봉: 높은 가격 (5MA = 110)
    for (let i = 0; i < 5; i++) candles.push(makeCandle(110));
    // 나머지 15봉: 낮은 가격 (20MA = (110*5 + 90*15)/20 = 95)
    for (let i = 0; i < 15; i++) candles.push(makeCandle(90));

    const result = evaluateBuyCondition(115, candles, makeStockInfo());
    expect(result.shouldBuy).toBe(true);
  });

  test("하락추세에서 매수 조건 미충족 (5MA <= 20MA)", () => {
    const candles: KisIntradayChartOutput2[] = [];
    // 최근 5봉: 낮은 가격
    for (let i = 0; i < 5; i++) candles.push(makeCandle(80));
    // 나머지 15봉: 높은 가격
    for (let i = 0; i < 15; i++) candles.push(makeCandle(110));

    const result = evaluateBuyCondition(85, candles, makeStockInfo());
    expect(result.shouldBuy).toBe(false);
    expect(result.reason).toContain("상승추세 아님");
  });

  test("분봉 데이터 부족 시 매수 불가", () => {
    const candles = [makeCandle(100), makeCandle(200)];
    const result = evaluateBuyCondition(150, candles, makeStockInfo());
    expect(result.shouldBuy).toBe(false);
    expect(result.reason).toContain("데이터 부족");
  });

  test("250일 저점 부근이면 진입 회피", () => {
    const candles: KisIntradayChartOutput2[] = [];
    for (let i = 0; i < 5; i++) candles.push(makeCandle(110));
    for (let i = 0; i < 15; i++) candles.push(makeCandle(90));

    const stockInfo = makeStockInfo({ d250LwprVrssPrprRate: "5.00" });
    const result = evaluateBuyCondition(115, candles, stockInfo);
    expect(result.shouldBuy).toBe(false);
    expect(result.reason).toContain("저점 부근");
  });

  test("거래량 회전율이 0이면 매수 불가", () => {
    const candles: KisIntradayChartOutput2[] = [];
    for (let i = 0; i < 5; i++) candles.push(makeCandle(110));
    for (let i = 0; i < 15; i++) candles.push(makeCandle(90));

    const stockInfo = makeStockInfo({ volTnrt: "0" });
    const result = evaluateBuyCondition(115, candles, stockInfo);
    expect(result.shouldBuy).toBe(false);
    expect(result.reason).toContain("유동성 부족");
  });

  test("현재가가 5MA 이하이면 매수 불가", () => {
    const candles: KisIntradayChartOutput2[] = [];
    for (let i = 0; i < 5; i++) candles.push(makeCandle(110));
    for (let i = 0; i < 15; i++) candles.push(makeCandle(90));

    // 5MA = 110, 현재가 = 105 <= 110
    const result = evaluateBuyCondition(105, candles, makeStockInfo());
    expect(result.shouldBuy).toBe(false);
    expect(result.reason).toContain("추세 아래");
  });
});

describe("evaluateSellCondition", () => {
  test("손절: 현재가가 기준가의 95% 이하", () => {
    // referencePrice=100000, 손절가=95000
    const result = evaluateSellCondition(95000, 100000, 110000, 5);
    expect(result.shouldSell).toBe(true);
    expect(result.reason).toContain("손절");
    expect(result.type).toBe("loss_cut");
  });

  test("손절 경계값: 현재가가 정확히 95%", () => {
    const result = evaluateSellCondition(95000, 100000, 110000, 5);
    expect(result.shouldSell).toBe(true);
    expect(result.type).toBe("loss_cut");
  });

  test("손절 미달: 현재가가 95% 초과", () => {
    const result = evaluateSellCondition(95001, 100000, 100000, 5);
    expect(result.shouldSell).toBe(false);
    expect(result.type).toBe("none");
  });

  test("익절: 현재가가 기준가의 115% 이상", () => {
    const result = evaluateSellCondition(115000, 100000, 115000, 5);
    expect(result.shouldSell).toBe(true);
    expect(result.reason).toContain("익절");
    expect(result.type).toBe("take_profit");
  });

  test("익절 경계값: 현재가가 정확히 115%", () => {
    const result = evaluateSellCondition(115000, 100000, 115000, 5);
    expect(result.shouldSell).toBe(true);
    expect(result.type).toBe("take_profit");
  });

  test("익절 미달: 현재가가 115% 미만", () => {
    const result = evaluateSellCondition(114999, 100000, 114999, 5);
    expect(result.shouldSell).toBe(false);
    expect(result.type).toBe("none");
  });

  test("트레일링 스탑: 고점 대비 5% 이상 하락", () => {
    // peak=110000, trailing=5%, stopPrice=104500
    const result = evaluateSellCondition(104500, 100000, 110000, 5);
    expect(result.shouldSell).toBe(true);
    expect(result.reason).toContain("트레일링 스탑");
    expect(result.type).toBe("trailing_stop");
  });

  test("트레일링 스탑 경계값: 정확히 고점 * 0.95", () => {
    const result = evaluateSellCondition(104500, 100000, 110000, 5);
    expect(result.shouldSell).toBe(true);
    expect(result.type).toBe("trailing_stop");
  });

  test("trailingStopPct=0이면 트레일링 스탑 비활성화", () => {
    // peak=110000, trailing=0% → 트레일링 스탑 체크 안 함
    const result = evaluateSellCondition(104500, 100000, 110000, 0);
    expect(result.shouldSell).toBe(false);
    expect(result.type).toBe("none");
  });

  test("매도 조건 미충족", () => {
    const result = evaluateSellCondition(105000, 100000, 110000, 5);
    expect(result.shouldSell).toBe(false);
    expect(result.reason).toContain("미충족");
    expect(result.type).toBe("none");
  });
});

describe("updatePeakPrice", () => {
  test("null이면 현재가로 초기화", () => {
    expect(updatePeakPrice(null, 100)).toBe(100);
  });

  test("현재가가 기존 고점보다 높으면 갱신", () => {
    expect(updatePeakPrice(100, 120)).toBe(120);
  });

  test("현재가가 기존 고점보다 낮으면 유지", () => {
    expect(updatePeakPrice(120, 100)).toBe(120);
  });

  test("현재가가 기존 고점과 같으면 유지", () => {
    expect(updatePeakPrice(100, 100)).toBe(100);
  });
});
