import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { createKisMarketClient } from "./market";
import type {
  KisDailyPriceParams,
  KisIndexPriceParams,
  KisIntradayChartParams,
  KisStockPriceParams,
} from "./types";

const originalFetch = globalThis.fetch;

const rawIntradayResponse = {
  rt_cd: "0",
  msg_cd: "MCA00000",
  msg1: "정상처리 되었습니다.",
  output1: {
    prdy_vrss: "100",
    prdy_vrss_sign: "2",
    prdy_ctrt: "0.15",
    stck_prdy_clpr: "66000",
    acml_vol: "10000000",
    acml_tr_pbmn: "660000000000",
    hts_kor_isnm: "삼성전자",
    stck_prpr: "66100",
  },
  output2: [
    {
      stck_bsop_date: "20250601",
      stck_cntg_hour: "130000",
      stck_prpr: "66100",
      stck_oprc: "66000",
      stck_hgpr: "66200",
      stck_lwpr: "65900",
      cntg_vol: "50000",
      acml_tr_pbmn: "330000000",
    },
  ],
};

const rawIndexPriceResponse = {
  rt_cd: "0",
  msg_cd: "MCA00000",
  msg1: "정상처리 되었습니다.",
  output: {
    bstp_nmix_prpr: "2650.50",
    bstp_nmix_prdy_vrss: "15.30",
    prdy_vrss_sign: "2",
    bstp_nmix_prdy_ctrt: "0.58",
    acml_vol: "500000000",
    prdy_vol: "480000000",
    acml_tr_pbmn: "12000000000000",
    prdy_tr_pbmn: "11500000000000",
    bstp_nmix_oprc: "2640.00",
    prdy_nmix_vrss_nmix_oprc: "4.80",
    oprc_vrss_prpr_sign: "2",
    bstp_nmix_oprc_prdy_ctrt: "0.18",
    bstp_nmix_hgpr: "2655.00",
    prdy_nmix_vrss_nmix_hgpr: "19.80",
    hgpr_vrss_prpr_sign: "5",
    bstp_nmix_hgpr_prdy_ctrt: "0.75",
    bstp_nmix_lwpr: "2638.00",
    prdy_clpr_vrss_lwpr: "2.80",
    lwpr_vrss_prpr_sign: "2",
    prdy_clpr_vrss_lwpr_rate: "0.11",
    ascn_issu_cnt: "520",
    uplm_issu_cnt: "3",
    stnr_issu_cnt: "80",
    down_issu_cnt: "300",
    lslm_issu_cnt: "1",
    dryy_bstp_nmix_hgpr: "2800.00",
    dryy_hgpr_vrss_prpr_rate: "-5.34",
    dryy_bstp_nmix_hgpr_date: "20250310",
    dryy_bstp_nmix_lwpr: "2400.00",
    dryy_lwpr_vrss_prpr_rate: "10.44",
    dryy_bstp_nmix_lwpr_date: "20250115",
    total_askp_rsqn: "5000000",
    total_bidp_rsqn: "4500000",
    seln_rsqn_rate: "52.63",
    shnu_rsqn_rate: "47.37",
    ntby_rsqn: "-500000",
  },
};

const rawStockPriceResponse = {
  rt_cd: "0",
  msg_cd: "MCA00000",
  msg1: "정상처리 되었습니다.",
  output: {
    iscd_stat_cls_code: "55",
    marg_rate: "20.00",
    rprs_mrkt_kor_name: "KOSPI200",
    new_hgpr_lwpr_cls_code: " ",
    bstp_kor_isnm: "전기전자",
    temp_stop_yn: "N",
    oprc_rang_cont_yn: "N",
    clpr_rang_cont_yn: "N",
    crdt_able_yn: "Y",
    grmn_rate_cls_code: "40",
    elw_pblc_yn: "Y",
    stck_prpr: "66100",
    prdy_vrss: "100",
    prdy_vrss_sign: "2",
    prdy_ctrt: "0.15",
    acml_tr_pbmn: "660000000000",
    acml_vol: "10000000",
    prdy_vrss_vol_rate: "85.20",
    stck_oprc: "66000",
    stck_hgpr: "66300",
    stck_lwpr: "65800",
    stck_mxpr: "85800",
    stck_llam: "46200",
    stck_sdpr: "66000",
    wghn_avrg_stck_prc: "66050",
    hts_frgn_ehrt: "52.50",
    frgn_ntby_qty: "-500000",
    pgtr_ntby_qty: "100000",
    pvt_scnd_dmrs_prc: "65500",
    pvt_frst_dmrs_prc: "65800",
    pvt_pont_val: "66100",
    pvt_frst_dmsp_prc: "66400",
    pvt_scnd_dmsp_prc: "66700",
    dmrs_val: "65800",
    dmsp_val: "66400",
    cpfn: "100",
    rstc_wdth_prc: "19800",
    stck_fcam: "100",
    stck_sspr: "66100",
    aspr_unit: "100",
    hts_deal_qty_unit_val: "1",
    lstn_stcn: "5969782550",
    hts_avls: "394603",
    per: "25.50",
    pbr: "1.20",
    stac_month: "12",
    vol_tnrt: "0.17",
    eps: "2592",
    bps: "55083",
    d250_hgpr: "72000",
    d250_hgpr_date: "20250310",
    d250_hgpr_vrss_prpr_rate: "-8.19",
    d250_lwpr: "53000",
    d250_lwpr_date: "20240815",
    d250_lwpr_vrss_prpr_rate: "24.72",
    stck_dryy_hgpr: "72000",
    dryy_hgpr_vrss_prpr_rate: "-8.19",
    dryy_hgpr_date: "20250310",
    stck_dryy_lwpr: "60000",
    dryy_lwpr_vrss_prpr_rate: "10.17",
    dryy_lwpr_date: "20250115",
    w52_hgpr: "72000",
    w52_hgpr_vrss_prpr_ctrt: "-8.19",
    w52_hgpr_date: "20250310",
    w52_lwpr: "53000",
    w52_lwpr_vrss_prpr_ctrt: "24.72",
    w52_lwpr_date: "20240815",
    whol_loan_rmnd_rate: "0.50",
    ssts_yn: "Y",
    stck_shrn_iscd: "005930",
    fcam_cnnm: "원",
    cpfn_cnnm: "원",
    apprch_rate: "50.00",
    frgn_hldn_qty: "3134000000",
    vi_cls_code: "N",
    ovtm_vi_cls_code: "N",
    last_ssts_cntg_qty: "0",
    invt_caful_yn: "N",
    mrkt_warn_cls_code: "00",
    short_over_yn: "N",
    sltr_yn: "N",
    mang_issu_cls_code: "00",
  },
};

beforeEach(() => {
  globalThis.fetch = mock(() =>
    Promise.resolve(new Response(JSON.stringify(rawIntradayResponse), { status: 200 })),
  );
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const credentials = { appkey: "my-appkey", appsecret: "my-appsecret" };
const token = "test-bearer-token";
const params: KisIntradayChartParams = {
  marketCode: "J",
  stockCode: "005930",
  inputHour: "130000",
  includePrevData: "N",
  etcClassCode: "",
};

const stockPriceParams: KisStockPriceParams = {
  marketCode: "J",
  stockCode: "005930",
};

const indexPriceParams: KisIndexPriceParams = {
  sectorCode: "0001",
};

const dailyPriceParams: KisDailyPriceParams = {
  marketCode: "J",
  stockCode: "005930",
  periodDivCode: "D",
  orgAdjPrc: "0",
};

const rawDailyPriceResponse = {
  rt_cd: "0",
  msg_cd: "MCA00000",
  msg1: "정상처리 되었습니다.",
  output: [
    {
      stck_bsop_date: "20260218",
      stck_oprc: "66000",
      stck_hgpr: "66300",
      stck_lwpr: "65800",
      stck_clpr: "66100",
      acml_vol: "10000000",
      prdy_vrss_vol_rate: "85.20",
      prdy_vrss: "100",
      prdy_vrss_sign: "2",
      prdy_ctrt: "0.15",
      hts_frgn_ehrt: "52.50",
      frgn_ntby_qty: "-500000",
      flng_cls_code: "00",
      acml_prtt_rate: "1.50",
    },
  ],
};

describe("createKisMarketClient", () => {
  test("sends correct query parameters", async () => {
    const client = createKisMarketClient("prod");
    await client.getIntradayChart(credentials, token, params);

    const callArgs = (globalThis.fetch as ReturnType<typeof mock>).mock.calls[0];
    const url = new URL(callArgs[0] as string);

    expect(url.searchParams.get("FID_COND_MRKT_DIV_CODE")).toBe("J");
    expect(url.searchParams.get("FID_INPUT_ISCD")).toBe("005930");
    expect(url.searchParams.get("FID_INPUT_HOUR_1")).toBe("130000");
    expect(url.searchParams.get("FID_PW_DATA_INCU_YN")).toBe("N");
    expect(url.searchParams.get("FID_ETC_CLS_CODE")).toBe("");
  });

  test("throws on HTTP error", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("Forbidden", { status: 403, statusText: "Forbidden" })),
    );

    const client = createKisMarketClient("prod");

    expect(client.getIntradayChart(credentials, token, params)).rejects.toThrow(
      "KIS intraday chart request failed: 403 Forbidden",
    );
  });
});

describe("getStockPrice", () => {
  test("sends correct query parameters", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(rawStockPriceResponse), { status: 200 })),
    );

    const client = createKisMarketClient("prod");
    await client.getStockPrice(credentials, token, stockPriceParams);

    const callArgs = (globalThis.fetch as ReturnType<typeof mock>).mock.calls[0];
    const url = new URL(callArgs[0] as string);

    expect(url.pathname).toBe("/uapi/domestic-stock/v1/quotations/inquire-price");
    expect(url.searchParams.get("FID_COND_MRKT_DIV_CODE")).toBe("J");
    expect(url.searchParams.get("FID_INPUT_ISCD")).toBe("005930");
  });

  test("throws on HTTP error", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("Forbidden", { status: 403, statusText: "Forbidden" })),
    );

    const client = createKisMarketClient("prod");

    expect(client.getStockPrice(credentials, token, stockPriceParams)).rejects.toThrow(
      "KIS stock price request failed: 403 Forbidden",
    );
  });

  test("maps snake_case response to camelCase", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(rawStockPriceResponse), { status: 200 })),
    );

    const client = createKisMarketClient("prod");
    const result = await client.getStockPrice(credentials, token, stockPriceParams);

    expect(result.rtCd).toBe("0");
    expect(result.msgCd).toBe("MCA00000");
    expect(result.output.stckPrpr).toBe("66100");
    expect(result.output.prdyVrss).toBe("100");
    expect(result.output.prdyVrssSign).toBe("2");
    expect(result.output.prdyCtrt).toBe("0.15");
    expect(result.output.acmlVol).toBe("10000000");
    expect(result.output.bstpKorIsnm).toBe("전기전자");
    expect(result.output.per).toBe("25.50");
    expect(result.output.pbr).toBe("1.20");
    expect(result.output.w52Hgpr).toBe("72000");
    expect(result.output.w52Lwpr).toBe("53000");
  });
});

describe("getIndexPrice", () => {
  test("sends correct query parameters", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(rawIndexPriceResponse), { status: 200 })),
    );

    const client = createKisMarketClient("prod");
    await client.getIndexPrice(credentials, token, indexPriceParams);

    const callArgs = (globalThis.fetch as ReturnType<typeof mock>).mock.calls[0];
    const url = new URL(callArgs[0] as string);

    expect(url.pathname).toBe("/uapi/domestic-stock/v1/quotations/inquire-index-price");
    expect(url.searchParams.get("FID_COND_MRKT_DIV_CODE")).toBe("U");
    expect(url.searchParams.get("FID_INPUT_ISCD")).toBe("0001");
  });

  test("throws on HTTP error", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("Forbidden", { status: 403, statusText: "Forbidden" })),
    );

    const client = createKisMarketClient("prod");

    expect(client.getIndexPrice(credentials, token, indexPriceParams)).rejects.toThrow(
      "KIS index price request failed: 403 Forbidden",
    );
  });

  test("maps snake_case response to camelCase", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(rawIndexPriceResponse), { status: 200 })),
    );

    const client = createKisMarketClient("prod");
    const result = await client.getIndexPrice(credentials, token, indexPriceParams);

    expect(result.rtCd).toBe("0");
    expect(result.msgCd).toBe("MCA00000");
    expect(result.output.bstpNmixPrpr).toBe("2650.50");
    expect(result.output.bstpNmixPrdyVrss).toBe("15.30");
    expect(result.output.prdyVrssSign).toBe("2");
    expect(result.output.bstpNmixPrdyCtrt).toBe("0.58");
    expect(result.output.acmlVol).toBe("500000000");
    expect(result.output.ascnIssuCnt).toBe("520");
    expect(result.output.downIssuCnt).toBe("300");
    expect(result.output.dryyBstpNmixHgpr).toBe("2800.00");
    expect(result.output.totalAskpRsqn).toBe("5000000");
    expect(result.output.ntbyRsqn).toBe("-500000");
  });
});

describe("getDailyPrice", () => {
  test("sends correct query parameters", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(rawDailyPriceResponse), { status: 200 })),
    );

    const client = createKisMarketClient("prod");
    await client.getDailyPrice(credentials, token, dailyPriceParams);

    const callArgs = (globalThis.fetch as ReturnType<typeof mock>).mock.calls[0];
    const url = new URL(callArgs[0] as string);

    expect(url.pathname).toBe("/uapi/domestic-stock/v1/quotations/inquire-daily-price");
    expect(url.searchParams.get("FID_COND_MRKT_DIV_CODE")).toBe("J");
    expect(url.searchParams.get("FID_INPUT_ISCD")).toBe("005930");
    expect(url.searchParams.get("FID_PERIOD_DIV_CODE")).toBe("D");
    expect(url.searchParams.get("FID_ORG_ADJ_PRC")).toBe("0");
  });

  test("throws on HTTP error", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("Forbidden", { status: 403, statusText: "Forbidden" })),
    );

    const client = createKisMarketClient("prod");

    expect(client.getDailyPrice(credentials, token, dailyPriceParams)).rejects.toThrow(
      "KIS daily price request failed: 403 Forbidden",
    );
  });

  test("maps snake_case response to camelCase", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(rawDailyPriceResponse), { status: 200 })),
    );

    const client = createKisMarketClient("prod");
    const result = await client.getDailyPrice(credentials, token, dailyPriceParams);

    expect(result.rtCd).toBe("0");
    expect(result.msgCd).toBe("MCA00000");
    expect(result.output).toHaveLength(1);
    expect(result.output[0].stckBsopDate).toBe("20260218");
    expect(result.output[0].stckOprc).toBe("66000");
    expect(result.output[0].stckHgpr).toBe("66300");
    expect(result.output[0].stckLwpr).toBe("65800");
    expect(result.output[0].stckClpr).toBe("66100");
    expect(result.output[0].acmlVol).toBe("10000000");
    expect(result.output[0].prdyVrss).toBe("100");
    expect(result.output[0].prdyVrssSign).toBe("2");
    expect(result.output[0].prdyCtrt).toBe("0.15");
    expect(result.output[0].htsFrgnEhrt).toBe("52.50");
    expect(result.output[0].frgnNtbyQty).toBe("-500000");
    expect(result.output[0].flngClsCode).toBe("00");
    expect(result.output[0].acmlPrttRate).toBe("1.50");
  });
});
