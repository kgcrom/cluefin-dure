import { type Static, Type } from '@sinclair/typebox';

export const ScenarioVariableSchema = Type.Object({
  name: Type.String(),
  baseline: Type.String(),
  scenario: Type.String(),
  direction: Type.Union([Type.Literal('up'), Type.Literal('down'), Type.Literal('neutral')]),
});

export const ScenarioDefinitionSchema = Type.Object({
  name: Type.String(),
  description: Type.String(),
  variables: Type.Array(ScenarioVariableSchema),
  affectedTickers: Type.Array(Type.String()),
  timeHorizon: Type.String(),
  assumptions: Type.Array(Type.String()),
});
export type ScenarioDefinition = Static<typeof ScenarioDefinitionSchema>;

export const ScenarioProjectionSchema = Type.Object({
  ticker: Type.String(),
  fundamentalImpact: Type.Object({
    direction: Type.Union([
      Type.Literal('positive'),
      Type.Literal('negative'),
      Type.Literal('neutral'),
    ]),
    magnitude: Type.Union([Type.Literal('low'), Type.Literal('medium'), Type.Literal('high')]),
    rationale: Type.String(),
    affectedMetrics: Type.Array(Type.String()),
  }),
  newsContext: Type.Object({
    expectedSentiment: Type.Union([
      Type.Literal('bullish'),
      Type.Literal('bearish'),
      Type.Literal('mixed'),
    ]),
    likelyCatalysts: Type.Array(Type.String()),
  }),
});
export type ScenarioProjection = Static<typeof ScenarioProjectionSchema>;

export const ScenarioReportSchema = Type.Object({
  scenarioName: Type.String(),
  projections: Type.Array(ScenarioProjectionSchema),
  overallAssessment: Type.String(),
  confidence: Type.Union([Type.Literal('low'), Type.Literal('medium'), Type.Literal('high')]),
  keyRisks: Type.Array(Type.String()),
  recommendations: Type.Array(Type.String()),
  disclaimer: Type.String(),
});
export type ScenarioReport = Static<typeof ScenarioReportSchema>;
