import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  runEquityAnalysis: vi.fn(),
  runScreening: vi.fn(),
  runStrategyResearch: vi.fn(),
  runScenarioAnalysis: vi.fn(),
  runReviewChecklist: vi.fn(),
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

vi.mock('../../src/workflow/runReviewChecklist.js', () => ({
  runReviewChecklist: mocks.runReviewChecklist,
}));

import { gradeDeterministicOutput, summarizeFailedChecks } from '../../src/evals/deterministic.js';
import { reviewChecklistTool, workflowTools } from '../../src/tools/workflowTools.js';
import {
  criticIterations,
  criticReport,
  fundamentals,
  newsAnalyses,
  scenarioDefinition,
  scenarioReport,
  strategy,
} from '../report/fixtures.js';
import { goldenWorkflowCases } from './goldenWorkflowFixtures.js';

describe('golden workflow regression evals', () => {
  beforeEach(() => {
    mocks.runEquityAnalysis.mockResolvedValue({
      runId: 'equity-123',
      tickers: ['005930'],
      fundamentals: [fundamentals[0]],
      newsAnalyses,
      criticReport,
      criticIterations,
    });
    mocks.runScreening.mockResolvedValue({
      runId: 'screen-123',
      rankings: fundamentals.map((fundamental) => ({
        ticker: fundamental.ticker,
        score: 80,
        fundamental,
      })),
    });
    mocks.runStrategyResearch.mockResolvedValue({
      runId: 'strategy-123',
      strategy,
      criticReport,
      criticIterations,
    });
    mocks.runScenarioAnalysis.mockResolvedValue({
      runId: 'scenario-123',
      scenarioContext: scenarioDefinition,
      fundamentals: [fundamentals[0]],
      newsAnalyses,
      report: scenarioReport,
    });
    mocks.runReviewChecklist.mockResolvedValue({
      runId: 'review-checklist-123',
      sourceRunId: 'equity-123',
      sourceType: 'equity',
      reviewers: {},
      finalReview: [
        'Verdict: revise',
        'Confidence: medium',
        'Top Findings:',
        '- major: valuation basis is thin',
        'Missing Evidence:',
        '- explicit downside case',
        'Questions:',
        '- What would invalidate the thesis?',
        'Feedback:',
        '- Add monitoring triggers.',
      ].join('\n'),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each(goldenWorkflowCases)('$id', async (testCase) => {
    const tool = [...workflowTools, reviewChecklistTool].find(
      (candidate) => candidate.name === testCase.toolName,
    );
    expect(tool, `missing tool ${testCase.toolName}`).toBeDefined();

    const result = await tool?.execute(
      `eval-${testCase.id}`,
      testCase.params as never,
      undefined,
      undefined,
      {} as never,
    );
    const text = result?.content[0]?.text ?? '';
    const actual =
      testCase.outputMode === 'json'
        ? JSON.parse(text)
        : {
            text,
            details: result?.details,
          };
    const grade = gradeDeterministicOutput(actual, testCase.expectations);

    expect(grade.passed, summarizeFailedChecks(grade)).toBe(true);
  });
});
