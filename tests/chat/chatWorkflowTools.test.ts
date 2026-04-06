import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRunEquityAnalysisChat, mockRunStrategyDraft, mockRunReviewChecklist } = vi.hoisted(() => ({
  mockRunEquityAnalysisChat: vi.fn(),
  mockRunStrategyDraft: vi.fn(),
  mockRunReviewChecklist: vi.fn(),
}));

vi.mock('../../src/workflow/runEquityAnalysisChat.js', () => ({
  runEquityAnalysisChat: mockRunEquityAnalysisChat,
}));

vi.mock('../../src/workflow/runStrategyDraft.js', () => ({
  runStrategyDraft: mockRunStrategyDraft,
}));

vi.mock('../../src/workflow/runReviewChecklist.js', () => ({
  runReviewChecklist: mockRunReviewChecklist,
}));

import {
  chatEquityAnalysisTool,
  chatWorkflowTools,
  reviewChecklistTool,
  chatStrategyResearchTool,
} from '../../src/tools/workflowTools.js';

describe('chatWorkflowTools', () => {
  beforeEach(() => {
    mockRunEquityAnalysisChat.mockResolvedValue({
      runId: 'equity-1',
      tickers: ['005930'],
      fundamentals: [],
      newsAnalyses: [],
      criticReport: { verdict: 'revise' },
      reviewChecklist: {
        runId: 'review-checklist-1',
        sourceRunId: 'equity-1',
        sourceType: 'equity',
        reviewers: {},
        finalReview: 'Overall Verdict: revise',
      },
    });
    mockRunStrategyDraft.mockResolvedValue({ runId: 'strategy-draft-1' });
    mockRunReviewChecklist.mockResolvedValue({
      runId: 'review-checklist-1',
      sourceRunId: 'equity-123',
      sourceType: 'equity',
      reviewers: {},
      finalReview: 'Overall Verdict: revise',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('대화형 모드에서 제거된 backtest workflow를 노출하지 않는다', () => {
    const names = chatWorkflowTools.map((tool) => tool.name);

    expect(names).toEqual([
      'run_equity_analysis',
      'run_screening',
      'run_strategy_research',
      'run_scenario_analysis',
      'run_review_checklist',
    ]);
    expect(names).not.toContain('run_backtest_loop');
    expect(names).not.toContain('run_backtest');
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

  it('run_review_checklist는 Markdown 리뷰를 반환하고 runId를 필수로 받는다', async () => {
    const schema = JSON.parse(JSON.stringify(reviewChecklistTool.parameters));
    expect(schema.required).toContain('runId');

    const result = await reviewChecklistTool.execute(
      'tool-3',
      { runId: 'equity-123' },
      undefined,
      undefined,
      {} as never,
    );

    expect(mockRunReviewChecklist).toHaveBeenCalledWith({ runId: 'equity-123' }, undefined);
    expect(result.content[0].text).toBe('Overall Verdict: revise');
    expect(result.details?.workflowResult).toMatchObject({
      sourceRunId: 'equity-123',
    });
  });

  it('run_review_checklist 에러를 그대로 표면화한다', async () => {
    mockRunReviewChecklist.mockRejectedValueOnce(new Error('missing run'));

    await expect(
      reviewChecklistTool.execute(
        'tool-4',
        { runId: 'equity-missing' },
        undefined,
        undefined,
        {} as never,
      ),
    ).rejects.toThrow('missing run');
  });
});
