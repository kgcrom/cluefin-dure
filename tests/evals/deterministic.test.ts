import { describe, expect, it } from 'vitest';
import { gradeDeterministicOutput, summarizeFailedChecks } from '../../src/evals/deterministic.js';

describe('deterministic eval grader', () => {
  it('required paths, array lengths, exact values, allowed values, and text snippets를 채점한다', () => {
    const grade = gradeDeterministicOutput(
      {
        runId: 'equity-123',
        tickers: ['005930'],
        criticReport: { verdict: 'keep' },
        finalReview: 'Verdict: pass\nConfidence: medium',
      },
      {
        runIdPrefix: 'equity-',
        requiredPaths: ['criticReport.verdict'],
        minArrayLengths: { tickers: 1 },
        equals: { 'criticReport.verdict': 'keep' },
        oneOf: { 'criticReport.verdict': ['keep', 'revise'] },
        includes: { finalReview: ['Verdict:', 'Confidence:'] },
      },
    );

    expect(grade.passed).toBe(true);
  });

  it('실패한 check를 요약한다', () => {
    const grade = gradeDeterministicOutput(
      { runId: 'screen-123', rankings: [] },
      {
        runIdPrefix: 'equity-',
        minArrayLengths: { rankings: 1 },
      },
    );

    expect(grade.passed).toBe(false);
    expect(summarizeFailedChecks(grade)).toContain('runIdPrefix');
    expect(summarizeFailedChecks(grade)).toContain('minArrayLength:rankings');
  });
});
