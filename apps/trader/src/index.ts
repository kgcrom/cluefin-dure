import {
  type BrokerEnv,
  createKisMarketClient,
  createKiwoomMarketClient,
  type KisIntradayChartParams,
  type KiwoomRankParams,
  type KiwoomVolumeSurgeParams,
} from "@cluefin/securities";
import { Hono } from "hono";
import type { Env } from "./bindings.js";
import { getBrokerToken } from "./token-store.js";

const app = new Hono<{ Bindings: Env }>();

app.get("/kis/intraday-chart", async (c) => {
  const token = await getBrokerToken(c.env, "kis");
  if (!token) {
    return c.json({ error: "KIS 토큰이 설정되지 않았습니다" }, 401);
  }

  const env = c.env.KIS_ENV as BrokerEnv;
  const credentials = {
    appkey: c.env.KIS_APP_KEY,
    appsecret: c.env.KIS_SECRET_KEY,
  };

  const params: KisIntradayChartParams = {
    marketCode: (c.req.query("market_code") ?? "J") as KisIntradayChartParams["marketCode"],
    stockCode: c.req.query("stock_code") ?? "",
    inputHour: c.req.query("input_hour") ?? "",
    includePrevData: c.req.query("include_prev_data") ?? "N",
    etcClassCode: c.req.query("etc_class_code") ?? "",
  };

  console.log("[kis/intraday-chart] params:", JSON.stringify(params));

  try {
    const client = createKisMarketClient(env);
    const result = await client.getIntradayChart(credentials, token, params);
    return c.json(result);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 502);
  }
});

app.get("/kiwoom/rank", async (c) => {
  const token = await getBrokerToken(c.env, "kiwoom");
  if (!token) {
    return c.json({ error: "Kiwoom 토큰이 설정되지 않았습니다" }, 401);
  }

  const env = c.env.KIWOOM_ENV as BrokerEnv;
  const params: KiwoomRankParams = {
    mrktTp: (c.req.query("mrkt_tp") ?? "000") as KiwoomRankParams["mrktTp"],
    amtQtyTp: (c.req.query("amt_qty_tp") ?? "1") as KiwoomRankParams["amtQtyTp"],
    qryDtTp: (c.req.query("qry_dt_tp") ?? "0") as KiwoomRankParams["qryDtTp"],
    date: c.req.query("date"),
    stexTp: (c.req.query("stex_tp") ?? "1") as KiwoomRankParams["stexTp"],
  };

  console.log("[kiwoom/rank] env:", env, "params:", JSON.stringify(params));

  try {
    const client = createKiwoomMarketClient(env);
    const result = await client.getRank(token, params);
    console.log("[kiwoom/rank] result count:", result.frgOrgnTrdeUpper.length);
    return c.json(result);
  } catch (e) {
    console.error("[kiwoom/rank] error:", e);
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 502);
  }
});

app.get("/kiwoom/volume-surge", async (c) => {
  const token = await getBrokerToken(c.env, "kiwoom");
  if (!token) {
    return c.json({ error: "Kiwoom 토큰이 설정되지 않았습니다" }, 401);
  }

  const env = c.env.KIWOOM_ENV as BrokerEnv;
  const params: KiwoomVolumeSurgeParams = {
    mrktTp: (c.req.query("mrkt_tp") ?? "000") as KiwoomVolumeSurgeParams["mrktTp"],
    sortTp: (c.req.query("sort_tp") ?? "1") as KiwoomVolumeSurgeParams["sortTp"],
    tmTp: (c.req.query("tm_tp") ?? "1") as KiwoomVolumeSurgeParams["tmTp"],
    trdeQtyTp: c.req.query("trde_qty_tp") ?? "",
    tm: c.req.query("tm"),
    stkCnd: c.req.query("stk_cnd") ?? "",
    pricTp: c.req.query("pric_tp") ?? "",
    stexTp: (c.req.query("stex_tp") ?? "1") as KiwoomVolumeSurgeParams["stexTp"],
  };

  try {
    const client = createKiwoomMarketClient(env);
    const result = await client.getVolumeSurge(token, params);
    return c.json(result);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 502);
  }
});

import { handleScheduled } from "./cron.js";

export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
};
