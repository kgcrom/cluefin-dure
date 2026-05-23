import type { DeterministicEvalExpectations } from '../../src/evals/deterministic.js';

export interface GoldenWorkflowCase {
  id: string;
  toolName: string;
  params: Record<string, unknown>;
  outputMode: 'json' | 'text';
  expectations: DeterministicEvalExpectations;
}

export const goldenWorkflowCases: GoldenWorkflowCase[] = [
  {
    id: 'equity-single-ticker',
    toolName: 'run_equity_analysis',
    params: { ticker: '005930' },
    outputMode: 'json',
    expectations: {
      runIdPrefix: 'equity-',
      requiredPaths: ['tickers', 'fundamentals', 'newsAnalyses', 'criticReport.verdict'],
      minArrayLengths: {
        tickers: 1,
        fundamentals: 1,
        newsAnalyses: 1,
        criticIterations: 1,
      },
      oneOf: {
        'criticReport.verdict': ['keep', 'revise', 'reject'],
      },
    },
  },
  {
    id: 'screening-ranked-output',
    toolName: 'run_screening',
    params: { market: 'KR', style: 'quality', topN: 2 },
    outputMode: 'json',
    expectations: {
      runIdPrefix: 'screen-',
      requiredPaths: ['rankings'],
      minArrayLengths: {
        rankings: 1,
      },
    },
  },
  {
    id: 'strategy-research-critic-loop',
    toolName: 'run_strategy_research',
    params: { theme: 'quality dividend', tickers: ['005930'] },
    outputMode: 'json',
    expectations: {
      runIdPrefix: 'strategy-',
      requiredPaths: ['strategy.name', 'criticReport.verdict', 'criticIterations'],
      minArrayLengths: {
        criticIterations: 1,
      },
      oneOf: {
        'criticReport.verdict': ['keep', 'revise', 'reject'],
      },
    },
  },
  {
    id: 'scenario-analysis-report',
    toolName: 'run_scenario_analysis',
    params: { scenario: '연준 50bp 긴급 인하', tickers: ['005930'] },
    outputMode: 'json',
    expectations: {
      runIdPrefix: 'scenario-',
      requiredPaths: ['scenarioContext.name', 'report.scenarioName', 'report.disclaimer'],
      minArrayLengths: {
        fundamentals: 1,
        newsAnalyses: 1,
      },
      includes: {
        'report.disclaimer': ['투자 조언이 아닙니다'],
      },
    },
  },
  {
    id: 'review-checklist-markdown-contract',
    toolName: 'run_review_checklist',
    params: { runId: 'equity-123' },
    outputMode: 'text',
    expectations: {
      requiredPaths: ['text', 'details.workflowResult.sourceRunId'],
      equals: {
        'details.workflowResult.sourceRunId': 'equity-123',
      },
      includes: {
        text: ['Verdict:', 'Confidence:', 'Top Findings:', 'Missing Evidence:', 'Feedback:'],
      },
    },
  },
];
