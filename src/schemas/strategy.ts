import { type Static, Type } from '@sinclair/typebox';

export const StrategyDefinitionSchema = Type.Object({
  name: Type.String({ description: 'Strategy name in English.' }),
  hypothesis: Type.String({ description: 'Investment hypothesis in English.' }),
  entryRules: Type.Array(Type.String({ description: 'Entry rule written in English.' })),
  exitRules: Type.Array(Type.String({ description: 'Exit rule written in English.' })),
  positionSizing: Type.String({ description: 'Position sizing description in English.' }),
  rebalancePeriod: Type.String({ description: 'Rebalance period written in English.' }),
  config: Type.Record(Type.String(), Type.Unknown()),
});
export type StrategyDefinition = Static<typeof StrategyDefinitionSchema>;

export const CriticReportSchema = Type.Object({
  overfittingRisk: Type.String({ description: 'Overfitting assessment in English.' }),
  dataLeakageCheck: Type.String({ description: 'Data leakage assessment in English.' }),
  survivorshipBias: Type.String({ description: 'Survivorship bias assessment in English.' }),
  regimeDependency: Type.String({ description: 'Regime dependency assessment in English.' }),
  verdict: Type.Union([Type.Literal('keep'), Type.Literal('revise'), Type.Literal('reject')]),
  recommendations: Type.Array(
    Type.String({ description: 'Actionable recommendation written in English.' }),
  ),
});
export type CriticReport = Static<typeof CriticReportSchema>;
