import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BacktestResult, StrategyDefinition } from '../../src/schemas/backtest.js';
import { DEFAULT_BACKTEST_TIMEOUT_MS } from '../../src/workflow/backtestTimeout.js';

const {
  mockLoadPrompt,
  mockBuildSessionLabel,
  mockExtractJsonWithRetry,
  mockGetToolsForAgent,
  mockCreatePiSession,
  mockGetMemoryTools,
} = vi.hoisted(() => ({
  mockLoadPrompt: vi.fn(),
  mockBuildSessionLabel: vi.fn(),
  mockExtractJsonWithRetry: vi.fn(),
  mockGetToolsForAgent: vi.fn(),
  mockCreatePiSession: vi.fn(),
  mockGetMemoryTools: vi.fn(),
}));

vi.mock('../../src/agents/_utils.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/agents/_utils.js')>(
    '../../src/agents/_utils.js',
  );

  return {
    ...actual,
    loadPrompt: mockLoadPrompt,
    buildSessionLabel: mockBuildSessionLabel,
    extractJsonWithRetry: mockExtractJsonWithRetry,
  };
});

vi.mock('../../src/rpc/agent-tools.js', () => ({
  getToolsForAgent: mockGetToolsForAgent,
}));

vi.mock('../../src/runtime/createPiSession.js', () => ({
  createPiSession: mockCreatePiSession,
}));

vi.mock('../../src/tools/memoryTools.js', () => ({
  getMemoryTools: mockGetMemoryTools,
}));

import { runBacktestAgent } from '../../src/agents/backtestAgent.js';

describe('runBacktestAgent timeout', () => {
  const strategy = {
    name: '테스트 전략',
    hypothesis: '테스트 가설',
    rules: [],
    config: {},
  } as unknown as StrategyDefinition;
  const backtestResult = {
    cagr: 0.1,
    mdd: -0.2,
    sharpe: 1.2,
    turnover: 0.3,
    tradeLog: [],
    runArtifactPath: 'data/backtests/test.json',
    errorLog: [],
  } as BacktestResult;
  const store = {
    put: vi.fn().mockResolvedValue(undefined),
  };
  const recorder = {};
  const session = {
    prompt: vi.fn(),
    abort: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    mockLoadPrompt.mockResolvedValue('system prompt');
    mockBuildSessionLabel.mockReturnValue('backtest:test');
    mockGetToolsForAgent.mockResolvedValue([]);
    mockGetMemoryTools.mockReturnValue([]);
    mockCreatePiSession.mockResolvedValue(session);
    mockExtractJsonWithRetry.mockResolvedValue(backtestResult);
    session.prompt.mockResolvedValue(undefined);
    session.abort.mockClear();
    store.put.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('timeoutMs 미지정 시 기본 7분 timeout을 적용한다', async () => {
    session.prompt.mockReturnValue(new Promise<void>(() => undefined));

    const promise = runBacktestAgent(
      'run-1',
      { strategy, tickers: ['005930'] },
      store as never,
      recorder as never,
    );
    const expected = expect(promise).rejects.toThrow('백테스트가 7분 제한 시간을 초과했습니다.');

    await vi.advanceTimersByTimeAsync(DEFAULT_BACKTEST_TIMEOUT_MS);

    await expected;
    expect(session.abort).toHaveBeenCalledTimes(1);
    expect(store.put).not.toHaveBeenCalled();
  });

  it('extractJsonWithRetry 단계도 timeout 범위에 포함한다', async () => {
    mockExtractJsonWithRetry.mockReturnValue(new Promise<BacktestResult>(() => undefined));

    const promise = runBacktestAgent(
      'run-2',
      { strategy, tickers: ['005930'], timeoutMs: 60_000 },
      store as never,
      recorder as never,
    );
    const expected = expect(promise).rejects.toThrow('백테스트가 1분 제한 시간을 초과했습니다.');

    await vi.advanceTimersByTimeAsync(60_000);

    await expected;
    expect(session.abort).toHaveBeenCalledTimes(1);
  });

  it('timeoutMs가 0이면 제한 없이 성공한다', async () => {
    const result = await runBacktestAgent(
      'run-3',
      { strategy, tickers: ['005930'], timeoutMs: 0 },
      store as never,
      recorder as never,
    );

    expect(result).toEqual(backtestResult);
    expect(session.abort).not.toHaveBeenCalled();
    expect(store.put).toHaveBeenCalledWith('run-3', 'backtest', 'output', backtestResult);
    expect(session.prompt).toHaveBeenCalledWith(expect.stringContaining('이번 백테스트는 시간 제한이 없습니다.'));
  });
});
