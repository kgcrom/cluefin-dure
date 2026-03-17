import { Type, type Static } from "@sinclair/typebox";
import { BacktestResultSchema } from "./backtest.js";

export const SignalSchema = Type.Object({
  ticker: Type.String(),
  direction: Type.Union([
    Type.Literal("long"),
    Type.Literal("short"),
    Type.Literal("neutral"),
  ]),
  confidence: Type.Number(),
  rationale: Type.String(),
  timestamp: Type.String(),
});
export type Signal = Static<typeof SignalSchema>;

export const ExperimentRecordSchema = Type.Object({
  id: Type.String(),
  strategyId: Type.String(),
  params: Type.Record(Type.String(), Type.Unknown()),
  result: BacktestResultSchema,
  criticVerdict: Type.Union([
    Type.Literal("keep"),
    Type.Literal("revise"),
    Type.Literal("reject"),
  ]),
  timestamp: Type.String(),
});
export type ExperimentRecord = Static<typeof ExperimentRecordSchema>;
