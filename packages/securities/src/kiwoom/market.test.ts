import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createKiwoomMarketClient } from "./market.js";
import type { KiwoomRankParams, KiwoomVolumeSurgeParams } from "./types.js";

const originalFetch = globalThis.fetch;

const rawResponse = {
  frgnr_orgn_trde_upper: [
    {
      for_netslmt_stk_cd: "005930",
      for_netslmt_stk_nm: "삼성전자",
      for_netslmt_amt: "100000",
      for_netslmt_qty: "1500",
      for_netprps_stk_cd: "000660",
      for_netprps_stk_nm: "SK하이닉스",
      for_netprps_amt: "200000",
      for_netprps_qty: "1000",
      orgn_netslmt_stk_cd: "035420",
      orgn_netslmt_stk_nm: "NAVER",
      orgn_netslmt_amt: "300000",
      orgn_netslmt_qty: "500",
      orgn_netprps_stk_cd: "035720",
      orgn_netprps_stk_nm: "카카오",
      orgn_netprps_amt: "400000",
      orgn_netprps_qty: "800",
    },
  ],
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
const params: KiwoomRankParams = {
  mrktTp: "000",
  amtQtyTp: "1",
  qryDtTp: "0",
  stexTp: "1",
};

describe("createKiwoomMarketClient", () => {
  test("omits date from body when not provided", async () => {
    const client = createKiwoomMarketClient("prod");
    await client.getRank(token, params);

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const init = callArgs[1] as RequestInit;
    const body = JSON.parse(init.body as string);

    expect(body).toEqual({
      mrkt_tp: "000",
      amt_qty_tp: "1",
      qry_dt_tp: "0",
      stex_tp: "1",
    });
    expect(body.date).toBeUndefined();
  });

  test("throws on HTTP error", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response("Forbidden", { status: 403, statusText: "Forbidden" })),
    );

    const client = createKiwoomMarketClient("prod");

    await expect(client.getRank(token, params)).rejects.toThrow(
      "Kiwoom rank request failed: 403 Forbidden",
    );
  });

  test("returns empty array when response has no frgnr_orgn_trde_upper field", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({}), { status: 200 })),
    );

    const client = createKiwoomMarketClient("prod");
    const result = await client.getRank(token, params);

    expect(result.frgOrgnTrdeUpper).toEqual([]);
  });
});

const volumeSurgeRawResponse = {
  trde_qty_sdnin: [
    {
      stk_cd: "005930",
      stk_nm: "삼성전자",
      cur_prc: "72000",
      pred_pre_sig: "2",
      pred_pre: "1500",
      flu_rt: "2.13",
      prev_trde_qty: "5000000",
      now_trde_qty: "15000000",
      sdnin_qty: "10000000",
      sdnin_rt: "300.00",
    },
  ],
};

const volumeSurgeParams: KiwoomVolumeSurgeParams = {
  mrktTp: "000",
  sortTp: "1",
  tmTp: "1",
  trdeQtyTp: "5",
  stkCnd: "0",
  pricTp: "0",
  stexTp: "1",
};

describe("getVolumeSurge", () => {
  test("omits tm from body when not provided", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(volumeSurgeRawResponse), { status: 200 })),
    );

    const client = createKiwoomMarketClient("prod");
    await client.getVolumeSurge(token, volumeSurgeParams);

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const init = callArgs[1] as RequestInit;
    const body = JSON.parse(init.body as string);

    expect(body.tm).toBeUndefined();
  });

  test("includes tm in body when provided", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(volumeSurgeRawResponse), { status: 200 })),
    );

    const client = createKiwoomMarketClient("prod");
    await client.getVolumeSurge(token, { ...volumeSurgeParams, tm: "10" });

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const init = callArgs[1] as RequestInit;
    const body = JSON.parse(init.body as string);

    expect(body.tm).toBe("10");
  });

  test("throws on HTTP error", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response("Forbidden", { status: 403, statusText: "Forbidden" })),
    );

    const client = createKiwoomMarketClient("prod");

    await expect(client.getVolumeSurge(token, volumeSurgeParams)).rejects.toThrow(
      "Kiwoom volume surge request failed: 403 Forbidden",
    );
  });

  test("returns empty array when response has no trde_qty_sdnin field", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({}), { status: 200 })),
    );

    const client = createKiwoomMarketClient("prod");
    const result = await client.getVolumeSurge(token, volumeSurgeParams);

    expect(result.trdeQtySdnin).toEqual([]);
  });
});
