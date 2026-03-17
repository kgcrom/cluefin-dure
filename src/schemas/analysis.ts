import { Type, type Static } from "@sinclair/typebox";

export const UniverseResultSchema = Type.Object({
  tickers: Type.Array(
    Type.Object({
      ticker: Type.String(),
      market: Type.String(),
      sector: Type.String(),
      rationale: Type.String(),
    })
  ),
  filterCriteria: Type.String(),
});
export type UniverseResult = Static<typeof UniverseResultSchema>;

export const FundamentalAnalysisSchema = Type.Object({
  ticker: Type.String(),
  metrics: Type.Object({
    revenue: Type.Number(),
    operatingMargin: Type.Number(),
    netMargin: Type.Number(),
    PE: Type.Number(),
    PB: Type.Number(),
    ROE: Type.Number(),
    debtToEquity: Type.Number(),
  }),
  growthTrend: Type.String(),
  quarterlyChanges: Type.String(),
  redFlags: Type.Array(Type.String()),
  memo: Type.String(),
});
export type FundamentalAnalysis = Static<typeof FundamentalAnalysisSchema>;

export const NewsAnalysisSchema = Type.Object({
  ticker: Type.String(),
  eventTimeline: Type.Array(
    Type.Object({
      date: Type.String(),
      headline: Type.String(),
      impact: Type.String(),
    })
  ),
  sentimentSummary: Type.String(),
  catalysts: Type.Array(Type.String()),
  risks: Type.Array(Type.String()),
});
export type NewsAnalysis = Static<typeof NewsAnalysisSchema>;
