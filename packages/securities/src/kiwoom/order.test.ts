import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createKiwoomOrderClient } from "./order.js";
import type { KiwoomBuyOrderParams, KiwoomDailyOrderParams } from "./types.js";

const originalFetch = globalThis.fetch;

const rawResponse = {
  ord_no: "0012345",
  dmst_stex_tp: "KRX",
};

beforeEach(() => {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve(new Response(JSON.stringify(rawResponse), { status: 200 })),
  );
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const token = "test-bearer-token";
const params: KiwoomBuyOrderParams = {
  dmstStexTp: "KRX",
  stkCd: "005930",
  ordQty: "10",
  trdeTp: "0",
};

describe("createKiwoomOrderClient", () => {
  test("includes ord_uv in body when provided", async () => {
    const client = createKiwoomOrderClient("prod");
    await client.buyOrder(token, { ...params, ordUv: "72000" });

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const init = callArgs[1] as RequestInit;
    const body = JSON.parse(init.body as string);

    expect(body.ord_uv).toBe("72000");
  });

  test("includes cond_uv in body when provided", async () => {
    const client = createKiwoomOrderClient("prod");
    await client.buyOrder(token, { ...params, condUv: "71000" });

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const init = callArgs[1] as RequestInit;
    const body = JSON.parse(init.body as string);

    expect(body.cond_uv).toBe("71000");
  });

  test("omits optional fields from body when not provided", async () => {
    const client = createKiwoomOrderClient("prod");
    await client.buyOrder(token, params);

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const init = callArgs[1] as RequestInit;
    const body = JSON.parse(init.body as string);

    expect(body.ord_uv).toBeUndefined();
    expect(body.cond_uv).toBeUndefined();
  });

  test("throws on HTTP error", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response("Forbidden", { status: 403, statusText: "Forbidden" })),
    );

    const client = createKiwoomOrderClient("prod");

    await expect(client.buyOrder(token, params)).rejects.toThrow(
      "Kiwoom buy order request failed: 403 Forbidden",
    );
  });

  test("returns empty strings when response fields are missing", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({}), { status: 200 })),
    );

    const client = createKiwoomOrderClient("prod");
    const result = await client.buyOrder(token, params);

    expect(result).toEqual({
      ordNo: "",
      dmstStexTp: "",
    });
  });
});

describe("getDailyOrders", () => {
  const dailyOrderParams: KiwoomDailyOrderParams = {
    qryTp: "0",
    sellTp: "0",
    stexTp: "0",
  };

  const rawDailyOrderResponse = {
    cntr: [
      {
        ord_no: "0001234",
        stk_nm: "삼성전자",
        io_tp_nm: "매수",
        ord_pric: "72000",
        ord_qty: "10",
        cntr_pric: "72000",
        cntr_qty: "10",
        oso_qty: "0",
        tdy_trde_cmsn: "100",
        tdy_trde_tax: "0",
        ord_stt: "체결",
        trde_tp: "현금",
        orig_ord_no: "",
        ord_tm: "093000",
        stk_cd: "005930",
        stex_tp: "1",
        stex_tp_txt: "KRX",
        sor_yn: "N",
        stop_pric: "",
      },
    ],
  };

  test("calls correct endpoint with required params", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(rawDailyOrderResponse), { status: 200 })),
    );

    const client = createKiwoomOrderClient("prod");
    await client.getDailyOrders(token, dailyOrderParams);

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = callArgs[0] as string;
    const init = callArgs[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    const body = JSON.parse(init.body as string);

    expect(url).toBe("https://api.kiwoom.com/api/dostk/acnt");
    expect(headers["api-id"]).toBe("ka10076");
    expect(body.qry_tp).toBe("0");
    expect(body.sell_tp).toBe("0");
    expect(body.stex_tp).toBe("0");
  });

  test("includes optional params in body when provided", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(rawDailyOrderResponse), { status: 200 })),
    );

    const client = createKiwoomOrderClient("prod");
    await client.getDailyOrders(token, {
      ...dailyOrderParams,
      stkCd: "005930",
      ordNo: "0001234",
    });

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const init = callArgs[1] as RequestInit;
    const body = JSON.parse(init.body as string);

    expect(body.stk_cd).toBe("005930");
    expect(body.ord_no).toBe("0001234");
  });

  test("includes pagination headers when provided", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(rawDailyOrderResponse), { status: 200 })),
    );

    const client = createKiwoomOrderClient("prod");
    await client.getDailyOrders(token, {
      ...dailyOrderParams,
      contYn: "Y",
      nextKey: "abc123",
    });

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const init = callArgs[1] as RequestInit;
    const headers = init.headers as Record<string, string>;

    expect(headers["cont-yn"]).toBe("Y");
    expect(headers["next-key"]).toBe("abc123");
  });

  test("maps response data correctly", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(rawDailyOrderResponse), { status: 200 })),
    );

    const client = createKiwoomOrderClient("prod");
    const result = await client.getDailyOrders(token, dailyOrderParams);

    expect(result.cntr).toHaveLength(1);
    expect(result.cntr[0]).toEqual({
      ordNo: "0001234",
      stkNm: "삼성전자",
      ioTpNm: "매수",
      ordPric: "72000",
      ordQty: "10",
      cntrPric: "72000",
      cntrQty: "10",
      osoQty: "0",
      tdyTrdeCmsn: "100",
      tdyTrdeTax: "0",
      ordStt: "체결",
      trdeTp: "현금",
      origOrdNo: "",
      ordTm: "093000",
      stkCd: "005930",
      stexTp: "1",
      stexTpTxt: "KRX",
      sorYn: "N",
      stopPric: "",
    });
  });

  test("extracts pagination info from response headers", async () => {
    const headers = new Headers();
    headers.set("cont-yn", "Y");
    headers.set("next-key", "next123");

    globalThis.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(rawDailyOrderResponse), { status: 200, headers }),
      ),
    );

    const client = createKiwoomOrderClient("prod");
    const result = await client.getDailyOrders(token, dailyOrderParams);

    expect(result.contYn).toBe("Y");
    expect(result.nextKey).toBe("next123");
  });

  test("throws on HTTP error", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response("Forbidden", { status: 403, statusText: "Forbidden" })),
    );

    const client = createKiwoomOrderClient("prod");

    await expect(client.getDailyOrders(token, dailyOrderParams)).rejects.toThrow(
      "Kiwoom daily order query failed: 403 Forbidden",
    );
  });

  test("returns empty array when cntr is missing", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({}), { status: 200 })),
    );

    const client = createKiwoomOrderClient("prod");
    const result = await client.getDailyOrders(token, dailyOrderParams);

    expect(result.cntr).toEqual([]);
  });
});
