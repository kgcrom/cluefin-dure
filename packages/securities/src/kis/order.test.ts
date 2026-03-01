import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createKisOrderClient } from "./order.js";
import type { KisBalanceParams, KisDailyOrderParams, KisOrderParams } from "./types.js";

const originalFetch = globalThis.fetch;

const rawResponse = {
  rt_cd: "0",
  msg_cd: "KIOK0000",
  msg1: "주문 전송 완료 되었습니다.",
  output: {
    KRX_FWDG_ORD_ORGNO: "91252",
    ODNO: "0000117057",
    ORD_TMD: "121052",
  },
};

beforeEach(() => {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve(new Response(JSON.stringify(rawResponse), { status: 200 })),
  );
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const credentials = { appkey: "my-appkey", appsecret: "my-appsecret" };
const token = "test-bearer-token";
const params: KisOrderParams = {
  accountNo: "50068923",
  accountProductCode: "01",
  stockCode: "005930",
  orderType: "00",
  quantity: "10",
  price: "66000",
};

describe("createKisOrderClient", () => {
  test("throws on HTTP error", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response("Forbidden", { status: 403, statusText: "Forbidden" })),
    );

    const client = createKisOrderClient("prod");

    await expect(client.buyOrder(credentials, token, params)).rejects.toThrow(
      "KIS order request failed: 403 Forbidden",
    );
  });
});

const rawDailyOrderResponse = {
  rt_cd: "0",
  msg_cd: "KIOK0000",
  msg1: "정상처리 되었습니다.",
  output1: [
    {
      ord_dt: "20250205",
      ord_gno_brno: "06010",
      odno: "0000117057",
      orgn_odno: "",
      sll_buy_dvsn_cd_name: "매수",
      sll_buy_dvsn_cd: "02",
      pdno: "005930",
      prdt_name: "삼성전자",
      ord_qty: "10",
      ord_unpr: "66000",
      ord_tmd: "121052",
      tot_ccld_qty: "10",
      tot_ccld_amt: "660000",
      avg_prvs: "66000",
      ccld_cndt: "66000",
      ord_dvsn_name: "지정가",
      ord_dvsn_cd: "00",
      mdfy_cnfm_qty: "0",
      cncl_cnfm_qty: "0",
      rmn_qty: "0",
      rjct_qty: "0",
      comm_media_cd: "01",
      comm_media_dvsn_name: "HTS",
      cndi_ord_dvsn_cd: "",
      cndi_ord_dvsn_cd_name: "",
      excg_id_dvsn_cd: "KRX",
      excg_id_dvsn_cd_name: "한국거래소",
    },
  ],
  output2: {
    tot_ord_qty: "10",
    tot_ccld_qty: "10",
    tot_ccld_amt: "660000",
    prdy_sll_amt: "0",
    prdy_buy_amt: "660000",
    sll_ccld_amt: "0",
    buy_ccld_amt: "660000",
  },
  tr_cont: "",
  ctx_area_fk100: "",
  ctx_area_nk100: "",
};

const dailyOrderParams: KisDailyOrderParams = {
  accountNo: "50068923",
  accountProductCode: "01",
  startDate: "20250201",
  endDate: "20250205",
};

describe("getDailyOrders", () => {
  test("fetches daily orders with correct URL and headers (production, recent)", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(rawDailyOrderResponse), { status: 200 })),
    );

    const client = createKisOrderClient("prod");
    const result = await client.getDailyOrders(credentials, token, dailyOrderParams);

    expect(result.rtCd).toBe("0");
    expect(result.output1).toHaveLength(1);
    expect(result.output1[0].pdno).toBe("005930");
    expect(result.output1[0].ordQty).toBe("10");
    expect(result.output2.totCcldAmt).toBe("660000");

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = fetchCall[0] as string;
    const options = fetchCall[1] as RequestInit;

    expect(url).toContain("/uapi/domestic-stock/v1/trading/inquire-daily-ccld");
    expect(url).toContain("CANO=50068923");
    expect(url).toContain("INQR_STRT_DT=20250201");
    expect(options.headers).toHaveProperty("tr_id", "TTTC0081R");
  });

  test("uses dev TR ID for dev environment", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(rawDailyOrderResponse), { status: 200 })),
    );

    const client = createKisOrderClient("dev");
    await client.getDailyOrders(credentials, token, dailyOrderParams);

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const options = fetchCall[1] as RequestInit;

    expect(options.headers).toHaveProperty("tr_id", "VTTC0081R");
  });

  test("uses old TR ID when withinThreeMonths is false", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(rawDailyOrderResponse), { status: 200 })),
    );

    const client = createKisOrderClient("prod");
    await client.getDailyOrders(credentials, token, dailyOrderParams, false);

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const options = fetchCall[1] as RequestInit;

    expect(options.headers).toHaveProperty("tr_id", "CTSC9215R");
  });

  test("throws on HTTP error", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response("Forbidden", { status: 403, statusText: "Forbidden" })),
    );

    const client = createKisOrderClient("prod");

    await expect(client.getDailyOrders(credentials, token, dailyOrderParams)).rejects.toThrow(
      "KIS daily order inquiry failed: 403 Forbidden",
    );
  });
});

const rawBalanceResponse = {
  rt_cd: "0",
  msg_cd: "KIOK0000",
  msg1: "정상처리 되었습니다.",
  output1: [
    {
      pdno: "005930",
      prdt_name: "삼성전자",
      trad_dvsn_name: "현금",
      bfdy_buy_qty: "0",
      bfdy_sll_qty: "0",
      thdt_buyqty: "10",
      thdt_sll_qty: "0",
      hldg_qty: "10",
      ord_psbl_qty: "10",
      pchs_avg_pric: "66000.0000",
      pchs_amt: "660000",
      prpr: "67000",
      evlu_amt: "670000",
      evlu_pfls_amt: "10000",
      evlu_pfls_rt: "1.52",
      evlu_erng_rt: "1.51515152",
      loan_dt: "",
      loan_amt: "0",
      stln_slng_chgs: "0",
      expd_dt: "",
      fltt_rt: "1.52",
      bfdy_cprs_icdc: "1000",
      item_mgna_rt_name: "20%",
      grta_rt_name: "",
      sbst_pric: "53600",
      stck_loan_unpr: "0",
    },
  ],
  output2: [
    {
      dnca_tot_amt: "1000000",
      nxdy_excc_amt: "1000000",
      prvs_rcdl_excc_amt: "1000000",
      cma_evlu_amt: "0",
      bfdy_buy_amt: "0",
      thdt_buy_amt: "660000",
      nxdy_auto_rdpt_amt: "0",
      bfdy_sll_amt: "0",
      thdt_sll_amt: "0",
      d2_auto_rdpt_amt: "0",
      bfdy_tlex_amt: "0",
      thdt_tlex_amt: "0",
      tot_loan_amt: "0",
      scts_evlu_amt: "670000",
      tot_evlu_amt: "1670000",
      nass_amt: "1670000",
      fncg_gld_auto_rdpt_yn: "N",
      pchs_amt_smtl_amt: "660000",
      evlu_amt_smtl_amt: "670000",
      evlu_pfls_smtl_amt: "10000",
      tot_stln_slng_chgs: "0",
      bfdy_tot_asst_evlu_amt: "1660000",
      asst_icdc_amt: "10000",
      asst_icdc_erng_rt: "0.60240964",
    },
  ],
  tr_cont: "",
  ctx_area_fk100: "",
  ctx_area_nk100: "",
};

const balanceParams: KisBalanceParams = {
  accountNo: "50068923",
  accountProductCode: "01",
};

describe("getBalance", () => {
  test("fetches balance with correct URL and headers (production)", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(rawBalanceResponse), { status: 200 })),
    );

    const client = createKisOrderClient("prod");
    const result = await client.getBalance(credentials, token, balanceParams);

    expect(result.rtCd).toBe("0");
    expect(result.output1).toHaveLength(1);
    expect(result.output1[0].pdno).toBe("005930");
    expect(result.output1[0].prdtName).toBe("삼성전자");
    expect(result.output1[0].hldgQty).toBe("10");
    expect(result.output1[0].evluPflsAmt).toBe("10000");
    expect(result.output2.dncaTotAmt).toBe("1000000");
    expect(result.output2.totEvluAmt).toBe("1670000");
    expect(result.output2.evluPflsSmtlAmt).toBe("10000");

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = fetchCall[0] as string;
    const options = fetchCall[1] as RequestInit;

    expect(url).toContain("/uapi/domestic-stock/v1/trading/inquire-balance");
    expect(url).toContain("CANO=50068923");
    expect(url).toContain("ACNT_PRDT_CD=01");
    expect(options.headers).toHaveProperty("tr_id", "TTTC8434R");
  });

  test("uses dev TR ID for dev environment", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(rawBalanceResponse), { status: 200 })),
    );

    const client = createKisOrderClient("dev");
    await client.getBalance(credentials, token, balanceParams);

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const options = fetchCall[1] as RequestInit;

    expect(options.headers).toHaveProperty("tr_id", "VTTC8434R");
  });

  test("throws on HTTP error", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response("Forbidden", { status: 403, statusText: "Forbidden" })),
    );

    const client = createKisOrderClient("prod");

    await expect(client.getBalance(credentials, token, balanceParams)).rejects.toThrow(
      "KIS balance inquiry failed: 403 Forbidden",
    );
  });

  test("maps snake_case response to camelCase", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(rawBalanceResponse), { status: 200 })),
    );

    const client = createKisOrderClient("prod");
    const result = await client.getBalance(credentials, token, balanceParams);

    const item = result.output1[0];
    expect(item.tradDvsnName).toBe("현금");
    expect(item.bfdyBuyQty).toBe("0");
    expect(item.thdtBuyqty).toBe("10");
    expect(item.pchsAvgPric).toBe("66000.0000");
    expect(item.pchsAmt).toBe("660000");
    expect(item.prpr).toBe("67000");
    expect(item.evluAmt).toBe("670000");
    expect(item.evluPflsRt).toBe("1.52");
    expect(item.itemMgnaRtName).toBe("20%");
    expect(item.sbstPric).toBe("53600");

    const summary = result.output2;
    expect(summary.nxdyExccAmt).toBe("1000000");
    expect(summary.sctsEvluAmt).toBe("670000");
    expect(summary.nassAmt).toBe("1670000");
    expect(summary.pchsAmtSmtlAmt).toBe("660000");
    expect(summary.evluAmtSmtlAmt).toBe("670000");
    expect(summary.bfdyTotAsstEvluAmt).toBe("1660000");
    expect(summary.asstIcdcErngRt).toBe("0.60240964");
  });
});
