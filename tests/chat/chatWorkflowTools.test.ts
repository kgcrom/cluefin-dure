import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRunEquityAnalysisChat, mockRunStrategyDraft } = vi.hoisted(() => ({
  mockRunEquityAnalysisChat: vi.fn(),
  mockRunStrategyDraft: vi.fn(),
}));

vi.mock('../../src/workflow/runEquityAnalysisChat.js', () => ({
  runEquityAnalysisChat: mockRunEquityAnalysisChat,
}));

vi.mock('../../src/workflow/runStrategyDraft.js', () => ({
  runStrategyDraft: mockRunStrategyDraft,
}));

import {
  chatEquityAnalysisTool,
  chatStrategyResearchTool,
  chatWorkflowTools,
} from '../../src/tools/workflowTools.js';

describe('chatWorkflowTools', () => {
  beforeEach(() => {
    mockRunEquityAnalysisChat.mockResolvedValue({ runId: 'equity-chat-1' });
    mockRunStrategyDraft.mockResolvedValue({ runId: 'strategy-draft-1' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('대화형 모드에서 run_backtest_loop를 노출하지 않는다', () => {
    const names = chatWorkflowTools.map((tool) => tool.name);

    expect(names).toEqual([
      'run_equity_analysis',
      'run_screening',
      'run_strategy_research',
      'run_scenario_analysis',
    ]);
    expect(names).not.toContain('run_backtest_loop');
  });

  it('대화형 run_equity_analysis는 chat 전용 워크플로우를 호출한다', async () => {
    await chatEquityAnalysisTool.execute(
      'tool-1',
      { ticker: '005930' },
      undefined,
      undefined,
      {} as never,
    );

    expect(mockRunEquityAnalysisChat).toHaveBeenCalledWith({ ticker: '005930' }, undefined);
  });

  it('대화형 run_strategy_research는 strategy draft만 호출하고 timeout 파라미터를 노출하지 않는다', async () => {
    const schema = JSON.parse(JSON.stringify(chatStrategyResearchTool.parameters));

    expect(schema.properties.timeoutMinutes).toBeUndefined();

    await chatStrategyResearchTool.execute(
      'tool-2',
      { theme: 'quality dividend', tickers: ['005930'] },
      undefined,
      undefined,
      {} as never,
    );

    expect(mockRunStrategyDraft).toHaveBeenCalledWith(
      { theme: 'quality dividend', tickers: ['005930'] },
      undefined,
    );
  });
});
