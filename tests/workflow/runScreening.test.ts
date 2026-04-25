import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  runUniverseAgent: vi.fn(),
  runFundamentalAgent: vi.fn(),
}));

vi.mock('../../src/agents/universeAgent.js', () => ({
  runUniverseAgent: mocks.runUniverseAgent,
}));

vi.mock('../../src/agents/fundamentalAgent.js', () => ({
  runFundamentalAgent: mocks.runFundamentalAgent,
}));

import { runScreening } from '../../src/workflow/runScreening.js';
import { screeningTool } from '../../src/tools/workflowTools.js';

describe('runScreening', () => {
  const originalMaxConcurrent = process.env.DURE_MAX_CONCURRENT_SESSIONS;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runUniverseAgent.mockResolvedValue({
      tickers: Array.from({ length: 8 }, (_, index) => ({ ticker: `00000${index}` })),
    });
    mocks.runFundamentalAgent.mockImplementation(async (_runId, input) => ({
      ticker: input.ticker,
      metrics: {},
    }));
  });

  afterEach(() => {
    if (originalMaxConcurrent === undefined) {
      delete process.env.DURE_MAX_CONCURRENT_SESSIONS;
    } else {
      process.env.DURE_MAX_CONCURRENT_SESSIONS = originalMaxConcurrent;
    }
  });

  it('topN 기본값 5개만 분석한다', async () => {
    const result = await runScreening({ market: 'KR' });

    expect(result.rankings).toHaveLength(5);
    expect(mocks.runFundamentalAgent).toHaveBeenCalledTimes(5);
  });

  it('명시한 topN을 사용한다', async () => {
    const result = await runScreening({ market: 'KR', topN: 2 });

    expect(result.rankings.map((ranking) => ranking.ticker)).toEqual(['000000', '000001']);
    expect(mocks.runFundamentalAgent).toHaveBeenCalledTimes(2);
  });

  it('DURE_MAX_CONCURRENT_SESSIONS로 workflow 병렬도를 제한한다', async () => {
    process.env.DURE_MAX_CONCURRENT_SESSIONS = '1';
    const started: string[] = [];
    let releaseFirst: (() => void) | undefined;

    mocks.runFundamentalAgent.mockImplementation(async (_runId, input) => {
      started.push(input.ticker);
      if (input.ticker === '000000') {
        await new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
      }
      return { ticker: input.ticker, metrics: {} };
    });

    const screening = runScreening({ market: 'KR', topN: 2 });

    await vi.waitFor(() => {
      expect(started).toEqual(['000000']);
    });
    releaseFirst?.();

    await expect(screening).resolves.toMatchObject({
      rankings: [{ ticker: '000000' }, { ticker: '000001' }],
    });
    expect(started).toEqual(['000000', '000001']);
  });

  it('tool schema 설명도 구현 기본값 5와 일치한다', () => {
    const schema = JSON.parse(JSON.stringify(screeningTool.parameters));

    expect(schema.properties.topN.description).toContain('기본: 5');
  });
});
