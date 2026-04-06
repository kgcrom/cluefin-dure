import { type Static, Type } from '@sinclair/typebox';

export const StrategyDefinitionSchema = Type.Object({
  name: Type.String(),
  hypothesis: Type.String(),
  entryRules: Type.Array(Type.String()),
  exitRules: Type.Array(Type.String()),
  positionSizing: Type.String(),
  rebalancePeriod: Type.String(),
  config: Type.Record(Type.String(), Type.Unknown()),
});
export type StrategyDefinition = Static<typeof StrategyDefinitionSchema>;

export const CriticReportSchema = Type.Object({
  overfittingRisk: Type.String(),
  dataLeakageCheck: Type.String(),
  survivorshipBias: Type.String(),
  regimeDependency: Type.String(),
  verdict: Type.Union([Type.Literal('keep'), Type.Literal('revise'), Type.Literal('reject')]),
  recommendations: Type.Array(Type.String()),
});
export type CriticReport = Static<typeof CriticReportSchema>;
