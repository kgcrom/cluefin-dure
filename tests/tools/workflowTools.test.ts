import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  runEquityAnalysis: vi.fn(),
  runScreening: vi.fn(),
  runStrategyResearch: vi.fn(),
  runScenarioAnalysis: vi.fn(),
}));

vi.mock('../../src/workflow/runEquityAnalysis.js', () => ({
  runEquityAnalysis: mocks.runEquityAnalysis,
}));

vi.mock('../../src/workflow/runScreening.js', () => ({
  runScreening: mocks.runScreening,
}));

vi.mock('../../src/workflow/runStrategyResearch.js', () => ({
  runStrategyResearch: mocks.runStrategyResearch,
}));

vi.mock('../../src/workflow/runScenarioAnalysis.js', () => ({
  runScenarioAnalysis: mocks.runScenarioAnalysis,
}));

import {
  equityAnalysisTool,
  scenarioAnalysisTool,
  screeningTool,
  strategyResearchTool,
  workflowTools,
} from '../../src/tools/workflowTools.js';

describe('workflowTools', () => {
  beforeEach(() => {
    mocks.runEquityAnalysis.mockResolvedValue({ runId: 'equity-1', tickers: ['005930'] });
    mocks.runScreening.mockResolvedValue({ runId: 'screen-1', rankings: [{ ticker: '005930' }] });
    mocks.runStrategyResearch.mockResolvedValue({
      runId: 'strategy-1',
      finalStrategy: { name: 'Quality' },
    });
    mocks.runScenarioAnalysis.mockResolvedValue({
      runId: 'scenario-1',
      report: { scenarioName: 'rate cut' },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('일반 workflow 도구 목록은 핵심 네 가지 실행 도구만 노출한다', () => {
    expect(workflowTools.map((tool) => tool.name)).toEqual([
      'run_equity_analysis',
      'run_screening',
      'run_strategy_research',
      'run_scenario_analysis',
    ]);
  });

  it('run_equity_analysis는 입력과 onUpdate를 workflow에 전달하고 JSON 결과를 반환한다', async () => {
    const onUpdate = vi.fn();

    const result = await equityAnalysisTool.execute(
      'tool-1',
      { ticker: '005930', style: 'quality' },
      undefined,
      onUpdate,
      {} as never,
    );

    expect(mocks.runEquityAnalysis).toHaveBeenCalledWith(
      { ticker: '005930', style: 'quality' },
      onUpdate,
    );
    expect(JSON.parse(result.content[0].text)).toEqual({
      runId: 'equity-1',
      tickers: ['005930'],
    });
    expect(result.details?.kind).toBe('workflow-log');
  });

  it('screening, strategy, scenario 도구는 각 workflow 결과를 JSON으로 감싼다', async () => {
    await expect(
      screeningTool.execute('tool-2', { market: 'KR', topN: 1 }, undefined, undefined, {} as never),
    ).resolves.toMatchObject({
      content: [{ text: JSON.stringify({ runId: 'screen-1', rankings: [{ ticker: '005930' }] }) }],
    });

    await expect(
      strategyResearchTool.execute(
        'tool-3',
        { theme: 'quality', tickers: ['005930'] },
        undefined,
        undefined,
        {} as never,
      ),
    ).resolves.toMatchObject({
      content: [
        { text: JSON.stringify({ runId: 'strategy-1', finalStrategy: { name: 'Quality' } }) },
      ],
    });

    await expect(
      scenarioAnalysisTool.execute(
        'tool-5',
        { scenario: 'rate cut', tickers: ['005930'] },
        undefined,
        undefined,
        {} as never,
      ),
    ).resolves.toMatchObject({
      content: [
        { text: JSON.stringify({ runId: 'scenario-1', report: { scenarioName: 'rate cut' } }) },
      ],
    });
  });

  it('workflow 실행 오류는 숨기지 않고 호출자에게 전파한다', async () => {
    mocks.runScenarioAnalysis.mockRejectedValueOnce(new Error('scenario failed'));

    await expect(
      scenarioAnalysisTool.execute(
        'tool-5',
        { scenario: 'stress' },
        undefined,
        undefined,
        {} as never,
      ),
    ).rejects.toThrow('scenario failed');
  });
});
