import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArtifactStore } from '../../src/runtime/artifactStore.js';
import type { EventRecorder } from '../../src/runtime/eventRecorder.js';

const mocks = vi.hoisted(() => ({
  createPiSession: vi.fn(),
  getToolsForAgent: vi.fn(),
}));

vi.mock('../../src/runtime/createPiSession.js', () => ({
  createPiSession: mocks.createPiSession,
}));

vi.mock('../../src/cli/agent-tools.js', () => ({
  getToolsForAgent: mocks.getToolsForAgent,
}));

import { runCriticAgent, runScenarioCriticAgent } from '../../src/agents/criticAgent.js';
import { runFundamentalAgent } from '../../src/agents/fundamentalAgent.js';
import { runNewsAgent } from '../../src/agents/newsAgent.js';
import { runScenarioAgent } from '../../src/agents/scenarioAgent.js';
import { runStrategyAgent } from '../../src/agents/strategyAgent.js';
import { runUniverseAgent } from '../../src/agents/universeAgent.js';

interface SessionOptions {
  agentName: string;
  sessionLabel: string;
  systemPrompt: string;
  customTools?: Array<{ name?: string }>;
  useCodeTools?: boolean;
}

interface CapturedSession {
  options: SessionOptions;
  prompts: string[];
}

const sessions: CapturedSession[] = [];
let store: Pick<ArtifactStore, 'put'>;
let recorder: EventRecorder;

beforeEach(() => {
  sessions.length = 0;
  store = { put: vi.fn() };
  recorder = {} as EventRecorder;
  mocks.getToolsForAgent.mockResolvedValue([{ name: 'rpc_lookup' }]);
  mocks.createPiSession.mockImplementation(async (options: SessionOptions) => {
    const captured: CapturedSession = { options, prompts: [] };
    const session = {
      state: {
        messages: [] as Array<{ role: string; content: string }>,
      },
      prompt: vi.fn(async (userMessage: string) => {
        captured.prompts.push(userMessage);
        session.state.messages.push({
          role: 'assistant',
          content: JSON.stringify(responseFor(options, captured.prompts.length)),
        });
      }),
    };

    sessions.push(captured);
    return session as never;
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('agent orchestration', () => {
  it('fundamental agent는 RPC와 memory 도구를 연결하고 scenario context를 prompt에 포함한다', async () => {
    const result = await runFundamentalAgent(
      'run-1',
      {
        ticker: '005930',
        scenarioContext: scenarioContext(),
      },
      store as ArtifactStore,
      recorder,
    );

    expect(result).toMatchObject({ ticker: '005930' });
    expect(mocks.getToolsForAgent).toHaveBeenCalledWith('fundamental');
    expect(sessions[0]?.options).toMatchObject({
      agentName: 'fundamental',
      sessionLabel: 'fundamental:005930',
    });
    expect(sessions[0]?.options.customTools?.map((tool) => tool.name)).toEqual([
      'rpc_lookup',
      'memory_read',
      'memory_search',
    ]);
    expect(sessions[0]?.prompts[0]).toContain('=== 시나리오 컨텍스트 ===');
    expect(store.put).toHaveBeenCalledWith('run-1', 'fundamental', '005930', result);
  });

  it('news agent는 news_search를 맨 앞에 두고 기본 기간과 scenario context를 전달한다', async () => {
    const result = await runNewsAgent(
      'run-2',
      { ticker: '000660', scenarioContext: scenarioContext() },
      store as ArtifactStore,
      recorder,
    );

    expect(result).toMatchObject({ ticker: '000660' });
    expect(sessions[0]?.options.customTools?.map((tool) => tool.name).slice(0, 4)).toEqual([
      'news_search',
      'rpc_lookup',
      'memory_read',
      'memory_search',
    ]);
    expect(sessions[0]?.prompts[0]).toContain('기간: 최근 3개월');
    expect(sessions[0]?.prompts[0]).toContain('위 시나리오 가정 하에서 이 종목의 뉴스/이벤트 영향을 분석하세요.');
    expect(store.put).toHaveBeenCalledWith('run-2', 'news', '000660', result);
  });

  it('scenario agent는 tickers를 prompt에 포함하고 definition artifact를 저장한다', async () => {
    const result = await runScenarioAgent(
      'scenario-run-1',
      { scenario: '50bp emergency cut', tickers: ['005930', '000660'] },
      store as ArtifactStore,
      recorder,
    );

    expect(result.affectedTickers).toEqual(['005930', '000660']);
    expect(sessions[0]?.options).toMatchObject({
      agentName: 'scenario',
      sessionLabel: 'scenario:scenario-run-1',
    });
    expect(sessions[0]?.prompts[0]).toContain('분석 대상 종목: 005930, 000660');
    expect(store.put).toHaveBeenCalledWith('scenario-run-1', 'scenario', 'definition', result);
  });

  it('universe agent는 누락된 옵션을 기본 문구로 채운다', async () => {
    const result = await runUniverseAgent('run-3', {}, store as ArtifactStore, recorder);

    expect(result.tickers[0]?.ticker).toBe('005930');
    expect(sessions[0]?.options.sessionLabel).toBe('universe:global');
    expect(sessions[0]?.prompts[0]).toContain('시장: 전체');
    expect(sessions[0]?.prompts[0]).toContain('스타일: 없음');
    expect(sessions[0]?.prompts[0]).toContain('필터규칙: 없음');
    expect(store.put).toHaveBeenCalledWith('run-3', 'universe', 'output', result);
  });

  it('strategy agent는 evidence와 feedback을 포함하고 비영어 결과를 재요청한다', async () => {
    const result = await runStrategyAgent(
      'run-4',
      {
        theme: 'quality dividend',
        fundamentals: [fundamentalAnalysis()],
        newsAnalyses: [newsAnalysis()],
        feedback: 'Add invalidation trigger.',
      },
      store as ArtifactStore,
      recorder,
    );

    expect(result.name).toBe('Quality Dividend');
    expect(sessions[0]?.options).toMatchObject({
      agentName: 'strategy',
      sessionLabel: 'strategy:quality dividend',
      useCodeTools: true,
    });
    expect(sessions[0]?.options.customTools?.map((tool) => tool.name)).toEqual([
      'rpc_lookup',
      'memory_read',
      'memory_write',
      'memory_search',
    ]);
    expect(sessions[0]?.prompts).toHaveLength(2);
    expect(sessions[0]?.prompts[0]).toContain('=== 펀더멘털 분석 ===');
    expect(sessions[0]?.prompts[0]).toContain('=== 뉴스 분석 ===');
    expect(sessions[0]?.prompts[0]).toContain('=== Critic 피드백 ===');
    expect(sessions[0]?.prompts[1]).toContain('Invalid field: strategy.name');
    expect(store.put).toHaveBeenCalledWith('run-4', 'strategy', 'output', result);
  });

  it('critic agent는 추가 분석 데이터를 포함하고 비영어 recommendations를 재요청한다', async () => {
    const result = await runCriticAgent(
      'run-5',
      {
        strategy: strategyDefinition(),
        additionalArtifacts: {
          stress: { maxDrawdown: -0.2 },
        },
      },
      store as ArtifactStore,
      recorder,
    );

    expect(result.verdict).toBe('revise');
    expect(sessions[0]?.options.customTools?.map((tool) => tool.name)).toEqual([
      'memory_read',
      'memory_write',
      'memory_search',
    ]);
    expect(sessions[0]?.prompts).toHaveLength(2);
    expect(sessions[0]?.prompts[0]).toContain('=== 추가 분석 데이터 ===');
    expect(sessions[0]?.prompts[0]).toContain('--- stress ---');
    expect(sessions[0]?.prompts[1]).toContain('Invalid field: critic.recommendations[0]');
    expect(store.put).toHaveBeenCalledWith('run-5', 'critic', 'output', result);
  });

  it('scenario critic agent는 fundamentals/news를 종합해 scenario-critic artifact를 저장한다', async () => {
    const result = await runScenarioCriticAgent(
      'run-6',
      {
        scenarioContext: scenarioContext(),
        fundamentals: [fundamentalAnalysis()],
        newsAnalyses: [newsAnalysis()],
      },
      store as ArtifactStore,
      recorder,
    );

    expect(result.scenarioName).toBe('Rate cut');
    expect(sessions[0]?.options.sessionLabel).toBe('critic:scenario:Rate cut');
    expect(sessions[0]?.prompts[0]).toContain('=== 펀더멘털 분석 ===');
    expect(sessions[0]?.prompts[0]).toContain('=== 뉴스 분석 ===');
    expect(store.put).toHaveBeenCalledWith('run-6', 'scenario-critic', 'output', result);
  });
});

function responseFor(options: SessionOptions, promptCount: number): unknown {
  if (options.agentName === 'fundamental') return fundamentalAnalysis();
  if (options.agentName === 'news') {
    const ticker = options.sessionLabel.replace('news:', '');
    return { ...newsAnalysis(), ticker };
  }
  if (options.agentName === 'scenario') return scenarioContext();
  if (options.agentName === 'universe') {
    return {
      tickers: [
        {
          ticker: '005930',
          market: 'KR',
          sector: 'Technology',
          rationale: 'Quality screen match',
        },
      ],
      filterCriteria: 'quality',
    };
  }
  if (options.agentName === 'strategy' && promptCount === 1) {
    return { ...strategyDefinition(), name: '품질 배당' };
  }
  if (options.agentName === 'strategy') return strategyDefinition();
  if (options.sessionLabel.startsWith('critic:scenario:')) return scenarioReport();
  if (options.agentName === 'critic' && promptCount === 1) {
    return { ...criticReport(), recommendations: ['리스크 한도를 추가하세요'] };
  }
  if (options.agentName === 'critic' && promptCount === 2) return criticReport();
  return scenarioReport();
}

function strategyDefinition() {
  return {
    name: 'Quality Dividend',
    hypothesis: 'Durable cash returns outperform in volatile regimes.',
    entryRules: ['Buy when ROE and dividend coverage are stable.'],
    exitRules: ['Exit when payout is debt funded.'],
    positionSizing: 'Equal weight with sector caps',
    rebalancePeriod: 'Quarterly',
    config: { minRoe: 15 },
  };
}

function criticReport() {
  return {
    overfittingRisk: 'Medium because factors are few.',
    dataLeakageCheck: 'No forward-looking metrics included.',
    survivorshipBias: 'Needs delisted-company check.',
    regimeDependency: 'Works best in defensive regimes.',
    verdict: 'revise' as const,
    recommendations: ['Add explicit drawdown stop.'],
  };
}

function scenarioContext() {
  return {
    name: 'Rate cut',
    description: 'Central bank cuts policy rates by 50bp.',
    variables: [
      {
        name: 'Policy rate',
        baseline: '5.00%',
        scenario: '4.50%',
        direction: 'down' as const,
      },
    ],
    affectedTickers: ['005930', '000660'],
    timeHorizon: '3 months',
    assumptions: ['Inflation remains contained.'],
  };
}

function fundamentalAnalysis() {
  return {
    ticker: '005930',
    metrics: {
      revenue: 100,
      operatingMargin: 20,
      netMargin: 15,
      PE: 12,
      PB: 1.2,
      ROE: 16,
      debtToEquity: 30,
    },
    growthTrend: 'Improving',
    quarterlyChanges: 'Margins expanded sequentially.',
    redFlags: ['Memory pricing volatility'],
    memo: 'HBM mix supports margin.',
  };
}

function newsAnalysis() {
  return {
    ticker: '005930',
    eventTimeline: [
      {
        date: '2026-01-01',
        headline: 'HBM supply agreement expanded',
        impact: 'positive',
      },
    ],
    sentimentSummary: 'Positive',
    catalysts: ['AI server demand'],
    risks: ['Memory downcycle'],
  };
}

function scenarioReport() {
  return {
    scenarioName: 'Rate cut',
    projections: [
      {
        ticker: '005930',
        fundamentalImpact: {
          direction: 'positive' as const,
          magnitude: 'medium' as const,
          rationale: 'Lower discount rates support valuation.',
          affectedMetrics: ['PE'],
        },
        newsContext: {
          expectedSentiment: 'bullish' as const,
          likelyCatalysts: ['FOMC decision'],
        },
      },
    ],
    overallAssessment: 'Moderately positive for quality technology exporters.',
    confidence: 'medium' as const,
    keyRisks: ['Inflation rebound'],
    recommendations: ['Monitor rate path.'],
    disclaimer: 'This analysis is LLM-based reasoning and not investment advice.',
  };
}
