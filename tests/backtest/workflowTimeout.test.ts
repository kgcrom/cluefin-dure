import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRunBacktestAgent, mockRunCriticAgent, mockRunStrategyAgent } = vi.hoisted(() => ({
  mockRunBacktestAgent: vi.fn(),
  mockRunCriticAgent: vi.fn(),
  mockRunStrategyAgent: vi.fn(),
}));

vi.mock('../../src/agents/backtestAgent.js', () => ({
  runBacktestAgent: mockRunBacktestAgent,
}));

vi.mock('../../src/agents/criticAgent.js', () => ({
  runCriticAgent: mockRunCriticAgent,
}));

vi.mock('../../src/agents/strategyAgent.js', () => ({
  runStrategyAgent: mockRunStrategyAgent,
}));

vi.mock('../../src/runtime/artifactStore.js', () => ({
  ArtifactStore: class ArtifactStore {},
}));

vi.mock('../../src/runtime/eventRecorder.js', () => ({
  EventRecorder: class EventRecorder {
    persist = vi.fn().mockResolvedValue(undefined);
    dispose = vi.fn();
    attachToSession = vi.fn();
  },
}));

vi.mock('../../src/memory/strategyRepo.js', () => ({
  StrategyRepo: class StrategyRepo {
    get = vi.fn().mockResolvedValue({
      strategy: {
        name: '저장 전략',
        hypothesis: '가설',
        rules: [],
        config: {},
      },
    });

    list = vi.fn().mockResolvedValue([]);
  },
}));

import * as backtestLoopModule from '../../src/workflow/runBacktestLoop.js';
import * as strategyResearchModule from '../../src/workflow/runStrategyResearch.js';
import { backtestLoopTool, strategyResearchTool } from '../../src/tools/workflowTools.js';

describe('workflow timeout 전달', () => {
  const strategy = {
    name: '테스트 전략',
    hypothesis: '가설',
    rules: [],
    config: {},
  };
  const backtestResult = {
    cagr: 0.1,
    mdd: -0.2,
    sharpe: 1.0,
    turnover: 0.1,
    tradeLog: [],
    runArtifactPath: 'data/backtests/test.json',
    errorLog: [],
  };

  beforeEach(() => {
    mockRunBacktestAgent.mockResolvedValue(backtestResult);
    mockRunCriticAgent.mockResolvedValue({ verdict: 'keep', recommendations: [] });
    mockRunStrategyAgent.mockResolvedValue(strategy);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('runStrategyResearch가 timeoutMinutes를 runBacktestAgent로 전달한다', async () => {
    await strategyResearchModule.runStrategyResearch({ theme: 'quality', timeoutMinutes: 5 });

    expect(mockRunBacktestAgent).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ timeoutMs: 300_000 }),
      expect.anything(),
      expect.anything(),
      undefined,
    );
  });

  it('runBacktestLoop가 timeoutMinutes=0을 runBacktestAgent로 전달한다', async () => {
    await backtestLoopModule.runBacktestLoop({
      strategy,
      tickers: ['005930'],
      maxIterations: 1,
      timeoutMinutes: 0,
    });

    expect(mockRunBacktestAgent).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ timeoutMs: 0 }),
      expect.anything(),
      expect.anything(),
      undefined,
    );
  });
});

describe('workflowTools timeout 표면', () => {
  beforeEach(() => {
    mockRunBacktestAgent.mockResolvedValue({
      cagr: 0.1,
      mdd: -0.2,
      sharpe: 1.0,
      turnover: 0.1,
      tradeLog: [],
      runArtifactPath: 'data/backtests/test.json',
      errorLog: [],
    });
    mockRunCriticAgent.mockResolvedValue({ verdict: 'keep', recommendations: [] });
    mockRunStrategyAgent.mockResolvedValue({
      name: '저장 전략',
      hypothesis: '가설',
      rules: [],
      config: {},
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('run_strategy_research 스키마에 timeoutMinutes를 노출한다', () => {
    const schema = JSON.parse(JSON.stringify(strategyResearchTool.parameters));

    expect(schema.properties.timeoutMinutes).toBeDefined();
    expect(schema.properties.timeoutMinutes.minimum).toBe(0);
  });

  it('run_backtest_loop 스키마에 timeoutMinutes를 노출한다', () => {
    const schema = JSON.parse(JSON.stringify(backtestLoopTool.parameters));

    expect(schema.properties.timeoutMinutes).toBeDefined();
    expect(schema.properties.timeoutMinutes.minimum).toBe(0);
  });

  it('run_strategy_research 도구가 timeoutMinutes를 워크플로우로 전달한다', async () => {
    await strategyResearchTool.execute(
      'tool-1',
      { theme: 'quality', timeoutMinutes: 0 },
      undefined,
      undefined,
    );

    expect(mockRunBacktestAgent).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ timeoutMs: 0 }),
      expect.anything(),
      expect.anything(),
      undefined,
    );
  });

  it('run_backtest_loop 도구가 timeoutMinutes를 워크플로우로 전달한다', async () => {
    await backtestLoopTool.execute(
      'tool-2',
      { strategyId: 'strategy-1', timeoutMinutes: 0 },
      undefined,
      undefined,
      {} as never,
    );

    expect(mockRunBacktestAgent).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ timeoutMs: 0 }),
      expect.anything(),
      expect.anything(),
      undefined,
    );
  });
});
