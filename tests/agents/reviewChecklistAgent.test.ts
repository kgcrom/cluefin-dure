import { mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreatePiSession } = vi.hoisted(() => ({
  mockCreatePiSession: vi.fn(),
}));

vi.mock('../../src/runtime/createPiSession.js', () => ({
  createPiSession: mockCreatePiSession,
}));

import { runReviewChecklistAgent } from '../../src/agents/reviewChecklistAgent.js';
import { ArtifactStore } from '../../src/runtime/artifactStore.js';
import { EventRecorder } from '../../src/runtime/eventRecorder.js';

const originalCwd = process.cwd();
const tempDirs: string[] = [];
const promptCalls: Array<{ label: string; systemPrompt: string; userMessage: string }> = [];
let failingLabel: string | undefined;

afterEach(async () => {
  process.chdir(originalCwd);
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
  promptCalls.length = 0;
  failingLabel = undefined;
  vi.clearAllMocks();
});

beforeEach(() => {
  mockCreatePiSession.mockImplementation(async (options) => {
    const session = {
      state: {
        messages: [] as Array<{ role: string; content: string }>,
      },
      subscribe: vi.fn(() => () => {}),
      prompt: vi.fn(async (userMessage: string) => {
        promptCalls.push({
          label: options.sessionLabel,
          systemPrompt: options.systemPrompt,
          userMessage,
        });

        if (failingLabel && options.sessionLabel.includes(failingLabel)) {
          throw new Error(`simulated failure for ${failingLabel}`);
        }

        let content = 'Verdict: revise\nConfidence: medium\nTop Findings:\n- major placeholder';

        if (options.sessionLabel.includes('company:')) {
          content = [
            'Verdict: revise',
            'Confidence: medium',
            'Top Findings:',
            '- major Company Analysis: valuation bridge is weak',
            'Missing Evidence:',
            '- peer valuation basis',
            'Questions:',
            '- margin durability evidence?',
            'Feedback:',
            '- tighten thesis-break conditions',
          ].join('\n');
        } else if (options.sessionLabel.includes('risk:')) {
          content = [
            'Verdict: revise',
            'Confidence: medium',
            'Top Findings:',
            '- major Risk Management: invalidation trigger is missing',
            'Missing Evidence:',
            '- downside path sizing',
            'Questions:',
            '- what triggers exit?',
            'Feedback:',
            '- add loss driver monitoring',
          ].join('\n');
        } else if (options.sessionLabel.includes('peer:')) {
          content = [
            'Verdict: revise',
            'Confidence: low',
            'Top Findings:',
            '- major Comparable Companies: peer set is incomplete',
            'Missing Evidence:',
            '- direct peer comparison',
            'Questions:',
            '- why these peers?',
            'Feedback:',
            '- justify or replace peer set',
          ].join('\n');
        } else if (options.sessionLabel.includes('cross-validation:')) {
          content = [
            'Verdict: revise',
            'Confidence: medium',
            'Top Findings:',
            '- major Cross-Validation: recommendation is stronger than evidence',
            'Missing Evidence:',
            '- second source for catalyst claim',
            'Questions:',
            '- how is this thesis cross-validated?',
            'Feedback:',
            '- soften recommendation strength',
          ].join('\n');
        } else if (options.sessionLabel.includes('synthesizer:')) {
          content = [
            'Overall Verdict: revise',
            'Decision Summary:',
            'The thesis needs revision before use.',
            'Blocking Issues:',
            '- missing invalidation trigger',
            'Non-blocking Improvements:',
            '- strengthen peer framing',
            'Priority Actions:',
            '- add explicit thesis-break conditions',
            'Ready For Investment Decision: no',
          ].join('\n');
        } else if (options.sessionLabel.includes('fallback:')) {
          content = [
            'Verdict: revise',
            'Confidence: low',
            'Top Findings:',
            '- critical fallback review used because a specialist reviewer failed',
            'Missing Evidence:',
            '- specialist split review',
            'Questions:',
            '- rerun with full reviewer set?',
            'Feedback:',
            '- rerun the checklist once the failing reviewer is available',
          ].join('\n');
        }

        session.state.messages.push({ role: 'assistant', content });
      }),
    };

    return session as never;
  });
});

describe('runReviewChecklistAgent', () => {
  it('specialist reviewers receive the same evidence bundle and synthesizer merges their outputs', async () => {
    const tempDir = await setupWorkspace();
    await writeEquityRun(tempDir, 'equity-123');

    const store = new ArtifactStore();
    const recorder = new EventRecorder();

    const result = await runReviewChecklistAgent(
      'review-checklist-1',
      { sourceRunId: 'equity-123' },
      store,
      recorder,
    );

    const reviewerCalls = promptCalls.filter(
      (call) =>
        call.label.includes('company:') ||
        call.label.includes('risk:') ||
        call.label.includes('peer:') ||
        call.label.includes('cross-validation:'),
    );

    expect(reviewerCalls).toHaveLength(4);
    expect(new Set(reviewerCalls.map((call) => call.userMessage)).size).toBe(1);
    expect(reviewerCalls[0]?.userMessage).toContain('"ticker": "005930"');
    expect(reviewerCalls[0]?.userMessage).toContain('"name": "Semiconductor Quality"');
    expect(
      promptCalls.find((call) => call.label.includes('synthesizer:'))?.userMessage,
    ).toContain('Company Analysis: valuation bridge is weak');
    expect(
      promptCalls.find((call) => call.label.includes('synthesizer:'))?.userMessage,
    ).toContain('=== Source Summary ===');
    expect(
      promptCalls.find((call) => call.label.includes('synthesizer:'))?.userMessage,
    ).not.toContain('=== Original Evidence Bundle ===');

    expect(result.sourceType).toBe('equity');
    expect(result.reviewers.companyAnalysis).toContain('Company Analysis');
    expect(result.finalReview).toContain('Overall Verdict: revise');

    const stored = await store.get('review-checklist-1', 'review-checklist', 'output');
    expect(stored).toMatchObject({
      runId: 'review-checklist-1',
      sourceRunId: 'equity-123',
    });
  });

  it('falls back to a single-agent review when any reviewer fails', async () => {
    const tempDir = await setupWorkspace();
    await writeEquityRun(tempDir, 'equity-456');
    failingLabel = 'risk:';

    const result = await runReviewChecklistAgent(
      'review-checklist-2',
      { sourceRunId: 'equity-456' },
      new ArtifactStore(),
      new EventRecorder(),
    );

    expect(result.reviewers.fallback).toContain('fallback review used');
    expect(result.finalReview).toContain('Fallback Mode:');
    expect(promptCalls.some((call) => call.label.includes('fallback:'))).toBe(true);
    expect(promptCalls.some((call) => call.label.includes('synthesizer:'))).toBe(false);
  });

  it('raises readable missing-artifact errors with exact paths', async () => {
    const tempDir = await setupWorkspace();
    const runDir = path.join(tempDir, 'data', 'runs', 'equity-789');
    await mkdir(path.join(runDir, 'fundamental'), { recursive: true });

    const error = await runReviewChecklistAgent(
      'review-checklist-3',
      { sourceRunId: 'equity-789' },
      new ArtifactStore(),
      new EventRecorder(),
    ).catch((caught) => caught as Error);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain(
      'review-checklist source run validation failed for equity-789.',
    );
    expect(error.message).toContain(path.join(runDir, 'strategy', 'output.json'));
    expect(error.message).toContain(path.join(runDir, 'critic', 'output.json'));
    expect(error.message).toContain(path.join(runDir, 'fundamental', '*.json'));
    expect(error.message).toContain(path.join(runDir, 'news', '*.json'));
  });
});

async function setupWorkspace(): Promise<string> {
  const tempDir = path.join(os.tmpdir(), `review-checklist-${Date.now()}-${Math.random()}`);
  await mkdir(tempDir, { recursive: true });
  tempDirs.push(tempDir);
  process.chdir(tempDir);
  return tempDir;
}

async function writeEquityRun(rootDir: string, runId: string): Promise<void> {
  const runDir = path.join(rootDir, 'data', 'runs', runId);

  await writeJson(path.join(runDir, 'strategy', 'output.json'), {
    name: 'Semiconductor Quality',
    hypothesis: 'HBM cycle continues',
  });
  await writeJson(path.join(runDir, 'critic', 'output.json'), {
    verdict: 'revise',
    recommendations: ['stress-test downturn'],
  });
  await writeJson(path.join(runDir, 'fundamental', '005930.json'), {
    ticker: '005930',
    memo: 'memory cycle upside',
  });
  await writeJson(path.join(runDir, 'news', '005930.json'), {
    ticker: '005930',
    catalysts: ['HBM demand'],
  });
  await writeJson(path.join(runDir, 'universe', 'output.json'), {
    tickers: [{ ticker: '005930' }],
  });
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
