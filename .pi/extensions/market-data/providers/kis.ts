import type { JsonValue } from "../types.js";
import { runOpenApiCli } from "../cli.js";

type Signal = AbortSignal | undefined;

export function getCurrentPrice(params: {
  stockCode: string;
  market?: "J" | "NX" | "UN";
}, signal?: Signal) {
  return runOpenApiCli(
    {
      broker: "kis",
      category: "stock",
      name: "current-price",
      params: {
        stock_code: params.stockCode,
        market: params.market,
      },
    },
    signal,
  );
}

export function getPriceHistory(params: {
  stockCode: string;
  startDate: string;
  endDate: string;
  market?: "J" | "NX" | "UN";
  period?: "D" | "W" | "M" | "Y";
  adjPrice?: "0" | "1";
}, signal?: Signal) {
  return runOpenApiCli(
    {
      broker: "kis",
      category: "chart",
      name: "period",
      params: {
        stock_code: params.stockCode,
        start_date: params.startDate,
        end_date: params.endDate,
        market: params.market,
        period: params.period,
        adj_price: params.adjPrice,
      },
    },
    signal,
  );
}

export async function getFinancials(params: {
  stockCode: string;
  market?: string;
  divClsCode?: "0" | "1";
}, signal?: Signal) {
  const commonParams = {
    stock_code: params.stockCode,
    market: params.market,
    div_cls_code: params.divClsCode,
  };

  const [incomeStatement, balanceSheet, ratio, growth, profitability, stability] = await Promise.all([
    runOpenApiCli({ broker: "kis", category: "financial", name: "income-statement", params: commonParams }, signal),
    runOpenApiCli({ broker: "kis", category: "financial", name: "balance-sheet", params: commonParams }, signal),
    runOpenApiCli({ broker: "kis", category: "financial", name: "ratio", params: commonParams }, signal),
    runOpenApiCli({ broker: "kis", category: "financial", name: "growth", params: commonParams }, signal),
    runOpenApiCli({ broker: "kis", category: "financial", name: "profitability", params: commonParams }, signal),
    runOpenApiCli({ broker: "kis", category: "financial", name: "stability", params: commonParams }, signal),
  ]);

  return {
    command: ["uv", "run", "cluefin-openapi-cli", "kis", "financial", "<bundle>", "--json"],
    cwd: incomeStatement.cwd,
    data: {
      income_statement: incomeStatement.data,
      balance_sheet: balanceSheet.data,
      ratio: ratio.data,
      growth: growth.data,
      profitability: profitability.data,
      stability: stability.data,
    } satisfies Record<string, JsonValue>,
  };
}

export function getMarketAnnouncement(params: {
  stockCode?: string;
  title?: string;
  startDate?: string;
}, signal?: Signal) {
  return runOpenApiCli(
    {
      broker: "kis",
      category: "market",
      name: "announcement",
      params: {
        stock_code: params.stockCode,
        titl_cntt: params.title,
        start_date: params.startDate,
      },
    },
    signal,
  );
}
