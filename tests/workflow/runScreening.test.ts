import { beforeEach, describe, expect, it, vi } from 'vitest';

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

  it('tool schema 설명도 구현 기본값 5와 일치한다', () => {
    const schema = JSON.parse(JSON.stringify(screeningTool.parameters));

    expect(schema.properties.topN.description).toContain('기본: 5');
  });
});
