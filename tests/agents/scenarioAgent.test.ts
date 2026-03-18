import { describe, expect, it } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  ScenarioDefinitionSchema,
  ScenarioProjectionSchema,
  ScenarioReportSchema,
} from '../../src/schemas/scenario.js';
import { runScenarioAgent } from '../../src/agents/scenarioAgent.js';

describe('ScenarioDefinition 스키마 검증', () => {
  it('유효한 ScenarioDefinition을 통과', () => {
    const valid = {
      name: '연준 50bp 긴급 인하',
      description: '연준이 50bp 긴급 금리 인하를 단행하는 시나리오',
      variables: [
        {
          name: '기준금리',
          baseline: '5.25%',
          scenario: '4.75%',
          direction: 'down' as const,
        },
      ],
      affectedTickers: ['005930', 'AAPL'],
      timeHorizon: '3개월',
      assumptions: ['인플레이션이 안정적이라고 가정'],
    };
    expect(Value.Check(ScenarioDefinitionSchema, valid)).toBe(true);
  });

  it('필수 필드 누락 시 실패', () => {
    const invalid = {
      name: '테스트',
      description: '설명',
      // variables 누락
      affectedTickers: [],
      timeHorizon: '1개월',
      assumptions: [],
    };
    expect(Value.Check(ScenarioDefinitionSchema, invalid)).toBe(false);
  });

  it('direction이 잘못된 값이면 실패', () => {
    const invalid = {
      name: '테스트',
      description: '설명',
      variables: [
        {
          name: '금리',
          baseline: '5%',
          scenario: '4%',
          direction: 'unknown',
        },
      ],
      affectedTickers: [],
      timeHorizon: '1개월',
      assumptions: [],
    };
    expect(Value.Check(ScenarioDefinitionSchema, invalid)).toBe(false);
  });
});

describe('ScenarioProjection 스키마 검증', () => {
  it('유효한 ScenarioProjection을 통과', () => {
    const valid = {
      ticker: '005930',
      fundamentalImpact: {
        direction: 'positive' as const,
        magnitude: 'high' as const,
        rationale: '금리 인하로 자금 조달 비용 감소',
        affectedMetrics: ['PER', 'ROE'],
      },
      newsContext: {
        expectedSentiment: 'bullish' as const,
        likelyCatalysts: ['FOMC 성명', '채권 시장 반응'],
      },
    };
    expect(Value.Check(ScenarioProjectionSchema, valid)).toBe(true);
  });
});

describe('ScenarioReport 스키마 검증', () => {
  it('유효한 ScenarioReport를 통과', () => {
    const valid = {
      scenarioName: '연준 50bp 긴급 인하',
      projections: [
        {
          ticker: '005930',
          fundamentalImpact: {
            direction: 'positive' as const,
            magnitude: 'medium' as const,
            rationale: '수출 환경 개선',
            affectedMetrics: ['매출'],
          },
          newsContext: {
            expectedSentiment: 'bullish' as const,
            likelyCatalysts: ['환율 하락'],
          },
        },
      ],
      overallAssessment: '반도체 섹터에 긍정적 영향 예상',
      confidence: 'medium' as const,
      keyRisks: ['인플레이션 재점화 가능성'],
      recommendations: ['반도체 비중 확대 검토'],
      disclaimer: '이 분석은 LLM 기반 추론이며 투자 조언이 아닙니다.',
    };
    expect(Value.Check(ScenarioReportSchema, valid)).toBe(true);
  });

  it('disclaimer 누락 시 실패', () => {
    const invalid = {
      scenarioName: '테스트',
      projections: [],
      overallAssessment: '평가',
      confidence: 'low',
      keyRisks: [],
      recommendations: [],
      // disclaimer 누락
    };
    expect(Value.Check(ScenarioReportSchema, invalid)).toBe(false);
  });
});

describe('runScenarioAgent', () => {
  it('함수 시그니처가 올바름', () => {
    expect(typeof runScenarioAgent).toBe('function');
    expect(runScenarioAgent.length).toBeGreaterThanOrEqual(4);
  });
});
