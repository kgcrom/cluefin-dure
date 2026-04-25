import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  runScenarioAgent: vi.fn(),
  runFundamentalAgent: vi.fn(),
  runNewsAgent: vi.fn(),
  runScenarioCriticAgent: vi.fn(),
}));

vi.mock('../../src/agents/scenarioAgent.js', () => ({
  runScenarioAgent: mocks.runScenarioAgent,
}));

vi.mock('../../src/agents/fundamentalAgent.js', () => ({
  runFundamentalAgent: mocks.runFundamentalAgent,
}));

vi.mock('../../src/agents/newsAgent.js', () => ({
  runNewsAgent: mocks.runNewsAgent,
}));

vi.mock('../../src/agents/criticAgent.js', () => ({
  runScenarioCriticAgent: mocks.runScenarioCriticAgent,
}));

import { runScenarioAnalysis } from '../../src/workflow/runScenarioAnalysis.js';

describe('runScenarioAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runScenarioAgent.mockResolvedValue({
      name: 'Rate Cut',
      affectedTickers: ['005930', '000660'],
      assumptions: [],
    });
    mocks.runFundamentalAgent.mockImplementation(async (_runId, input) => ({
      ticker: input.ticker,
      metrics: {},
    }));
    mocks.runNewsAgent.mockImplementation(async (_runId, input) => ({
      ticker: input.ticker,
      catalysts: [],
    }));
    mocks.runScenarioCriticAgent.mockResolvedValue({
      scenarioName: 'Rate Cut',
      projections: [],
      overallAssessment: 'mixed',
      confidence: 'medium',
      keyRisks: [],
      recommendations: [],
      disclaimer: '이 분석은 LLM 기반 추론이며 투자 조언이 아닙니다.',
    });
  });

  it('일부 종목 분석 실패 시 성공한 종목만 critic에 전달한다', async () => {
    mocks.runFundamentalAgent.mockImplementation(async (_runId, input) => {
      if (input.ticker === '000660') throw new Error('fundamental failed');
      return { ticker: input.ticker, metrics: {} };
    });

    const result = await runScenarioAnalysis({ scenario: 'rate cut' });

    expect(result.fundamentals).toHaveLength(1);
    expect(result.newsAnalyses).toHaveLength(1);
    expect(mocks.runScenarioCriticAgent).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        fundamentals: [{ ticker: '005930', metrics: {} }],
        newsAnalyses: [{ ticker: '005930', catalysts: [] }],
      }),
      expect.anything(),
      expect.anything(),
      undefined,
    );
  });

  it('모든 종목 분석이 실패하면 에러를 던진다', async () => {
    mocks.runFundamentalAgent.mockRejectedValue(new Error('all failed'));

    await expect(runScenarioAnalysis({ scenario: 'rate cut' })).rejects.toThrow(
      '모든 종목 분석이 실패했습니다.',
    );
  });

  it('critic 실패 시 low-confidence fallback report를 반환한다', async () => {
    mocks.runScenarioCriticAgent.mockRejectedValue(new Error('critic failed'));

    const result = await runScenarioAnalysis({ scenario: 'rate cut' });

    expect(result.report).toMatchObject({
      scenarioName: 'Rate Cut',
      confidence: 'low',
      keyRisks: ['Critic 에이전트 응답 실패로 종합 평가 누락'],
    });
  });
});
