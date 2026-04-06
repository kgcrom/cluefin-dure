import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CriticReport } from '../../src/schemas/strategy.js';

const hoisted = vi.hoisted(() => ({
  mockRunCriticAgent: vi.fn(),
  mockRunStrategyAgent: vi.fn(),
}));

vi.mock('../../src/agents/criticAgent.js', () => ({
  runCriticAgent: hoisted.mockRunCriticAgent,
}));

vi.mock('../../src/agents/strategyAgent.js', () => ({
  runStrategyAgent: hoisted.mockRunStrategyAgent,
}));

vi.mock('../../src/agents/fundamentalAgent.js', () => ({
  runFundamentalAgent: vi.fn(async () => ({
    ticker: '005930',
    growthTrend: 'stable',
    quarterlyChanges: '',
    redFlags: [],
    memo: '',
    metrics: {
      revenue: 1_000,
      operatingMargin: 0.1,
      netMargin: 0.05,
      PE: 15,
      PB: 1.2,
      ROE: 0.12,
      debtToEquity: 0.5,
    },
  })),
}));

vi.mock('../../src/agents/newsAgent.js', () => ({
  runNewsAgent: vi.fn(async () => ({
    ticker: '005930',
    sentimentSummary: 'neutral',
    eventTimeline: [],
    catalysts: [],
    risks: [],
    lastUpdated: '',
  })),
}));

import { runEquityAnalysis } from '../../src/workflow/runEquityAnalysis.js';
import { runStrategyResearch } from '../../src/workflow/runStrategyResearch.js';

describe('critic autoresearch loops', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('strategy research는 revise/keep 사이클로 loop한다', async () => {
    const initStrategy = {
      name: '초안 전략',
      hypothesis: '초기 가설',
      entryRules: ['PE < 15'],
      exitRules: ['ROE < 10'],
      positionSizing: '1%',
      rebalancePeriod: 'monthly',
      config: {},
    };
    const revisedStrategy = {
      ...initStrategy,
      name: '수정 전략',
      hypothesis: '수정 가설',
    };

    const baseCritic = (verdict: CriticReport['verdict'], recommendations: string[]) => ({
      verdict,
      recommendations,
      overfittingRisk: '낮음',
      dataLeakageCheck: '통과',
      survivorshipBias: '낮음',
      regimeDependency: '낮음',
    });

    hoisted.mockRunStrategyAgent
      .mockResolvedValueOnce(initStrategy)
      .mockResolvedValueOnce(revisedStrategy);
    hoisted.mockRunCriticAgent
      .mockResolvedValueOnce(baseCritic('revise', ['revise this']))
      .mockResolvedValueOnce(baseCritic('keep', ['good']));

    const result = await runStrategyResearch({ theme: 'quality growth' });

    expect(hoisted.mockRunStrategyAgent).toHaveBeenCalledTimes(2);
    expect(hoisted.mockRunCriticAgent).toHaveBeenCalledTimes(2);
    expect(hoisted.mockRunStrategyAgent).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      { theme: 'quality growth' },
      expect.anything(),
      expect.anything(),
      undefined,
    );
    expect(hoisted.mockRunStrategyAgent).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      { theme: '초기 가설', feedback: 'revise this' },
      expect.anything(),
      expect.anything(),
      undefined,
    );
    expect(result.strategy).toEqual(revisedStrategy);
    expect(result.criticIterations).toHaveLength(2);
    expect(result.criticIterations[0].verdict).toBe('revise');
    expect(result.criticIterations[1].verdict).toBe('keep');
    expect(hoisted.mockRunCriticAgent).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      {
        strategy: initStrategy,
        additionalArtifacts: {
          theme: 'quality growth',
          fundamentals: undefined,
          newsAnalyses: undefined,
          universe: undefined,
        },
      },
      expect.anything(),
      expect.anything(),
      undefined,
    );
  });

  it('equity 분석도 revise/keep 루프로 개선한다', async () => {
    const baseStrategy = {
      name: '종목 전략',
      hypothesis: '종목 초안',
      entryRules: ['ROE > 0.1'],
      exitRules: ['loss > 2%'],
      positionSizing: '3%',
      rebalancePeriod: 'monthly',
      config: {},
    };
    const reviseStrategy = {
      ...baseStrategy,
      name: '종목 수정',
      hypothesis: '종목 수정 가설',
    };

    const baseCritic = (verdict: CriticReport['verdict'], recommendations: string[]) => ({
      verdict,
      recommendations,
      overfittingRisk: '낮음',
      dataLeakageCheck: '통과',
      survivorshipBias: '낮음',
      regimeDependency: '낮음',
    });

    hoisted.mockRunStrategyAgent
      .mockResolvedValueOnce(baseStrategy)
      .mockResolvedValueOnce(reviseStrategy);
    hoisted.mockRunCriticAgent
      .mockResolvedValueOnce(baseCritic('revise', ['revise more']))
      .mockResolvedValueOnce(baseCritic('keep', ['good']));

    const result = await runEquityAnalysis({ ticker: '005930' });

    expect(hoisted.mockRunStrategyAgent).toHaveBeenCalledTimes(2);
    expect(hoisted.mockRunCriticAgent).toHaveBeenCalledTimes(2);
    expect(result.criticIterations).toHaveLength(2);
    expect(result.criticIterations[0].strategy).toEqual(baseStrategy);
    expect(result.criticIterations[1].strategy).toEqual(reviseStrategy);
    expect(result.criticIterations[1].verdict).toBe('keep');
    expect(hoisted.mockRunCriticAgent).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      {
        strategy: reviseStrategy,
        additionalArtifacts: {
          theme: '005930 기반 투자전략',
          fundamentals: expect.any(Array),
          newsAnalyses: expect.any(Array),
          universe: undefined,
        },
      },
      expect.anything(),
      expect.anything(),
      undefined,
    );
  });
});
