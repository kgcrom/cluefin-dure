import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRunEquityAnalysis, mockRunReviewChecklist } = vi.hoisted(() => ({
  mockRunEquityAnalysis: vi.fn(),
  mockRunReviewChecklist: vi.fn(),
}));

vi.mock('../../src/workflow/runEquityAnalysis.js', () => ({
  runEquityAnalysis: mockRunEquityAnalysis,
}));

vi.mock('../../src/workflow/runReviewChecklist.js', () => ({
  runReviewChecklist: mockRunReviewChecklist,
}));

import { runEquityAnalysisChat } from '../../src/workflow/runEquityAnalysisChat.js';

describe('runEquityAnalysisChat', () => {
  beforeEach(() => {
    mockRunEquityAnalysis.mockResolvedValue({
      runId: 'equity-123',
      tickers: ['005930'],
      fundamentals: [{ ticker: '005930' }],
      newsAnalyses: [{ ticker: '005930' }],
      criticReport: { verdict: 'revise' },
    });
    mockRunReviewChecklist.mockResolvedValue({
      runId: 'review-checklist-123',
      sourceRunId: 'equity-123',
      sourceType: 'equity',
      reviewers: {},
      finalReview: 'Overall Verdict: revise',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('equity 분석 후 자동으로 review checklist를 이어서 실행한다', async () => {
    const result = await runEquityAnalysisChat({ ticker: '005930' });

    expect(mockRunEquityAnalysis).toHaveBeenCalledWith({ ticker: '005930' }, undefined);
    expect(mockRunReviewChecklist).toHaveBeenCalledWith({ runId: 'equity-123' }, undefined);
    expect(result).toMatchObject({
      runId: 'equity-123',
      reviewChecklist: {
        runId: 'review-checklist-123',
        sourceRunId: 'equity-123',
      },
    });
  });
});
