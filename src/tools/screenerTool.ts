import type { ToolDefinition } from '@mariozechner/pi-coding-agent';
import { type Static, Type } from '@sinclair/typebox';
import { toolResult } from './_helpers.js';

const parameters = Type.Object({
  criteria: Type.Array(
    Type.Object({
      metric: Type.String({ description: '지표명 (예: PE, ROE, marketCap)' }),
      operator: Type.Union([
        Type.Literal('gt'),
        Type.Literal('lt'),
        Type.Literal('gte'),
        Type.Literal('lte'),
        Type.Literal('eq'),
      ]),
      value: Type.Number(),
    }),
    { description: '스크리닝 조건 목록' },
  ),
  market: Type.Optional(Type.String({ description: '시장 (예: US, KR)' })),
  limit: Type.Optional(Type.Number({ description: '최대 반환 종목 수' })),
});

type Params = Static<typeof parameters>;

const MOCK_UNIVERSE = [
  {
    ticker: 'AAPL',
    market: 'US',
    sector: 'Technology',
    PE: 28.5,
    PB: 45.2,
    ROE: 147,
    marketCap: 2_800_000_000_000,
  },
  {
    ticker: 'MSFT',
    market: 'US',
    sector: 'Technology',
    PE: 35.2,
    PB: 12.8,
    ROE: 38,
    marketCap: 3_100_000_000_000,
  },
  {
    ticker: 'NVDA',
    market: 'US',
    sector: 'Technology',
    PE: 65.3,
    PB: 52.1,
    ROE: 115,
    marketCap: 2_200_000_000_000,
  },
  {
    ticker: '005930',
    market: 'KR',
    sector: 'Technology',
    PE: 12.8,
    PB: 1.3,
    ROE: 8.5,
    marketCap: 430_000_000_000_000,
  },
  {
    ticker: '000660',
    market: 'KR',
    sector: 'Technology',
    PE: 8.5,
    PB: 1.8,
    ROE: 22,
    marketCap: 85_000_000_000_000,
  },
  {
    ticker: '035420',
    market: 'KR',
    sector: 'Communication Services',
    PE: 22.1,
    PB: 3.2,
    ROE: 12,
    marketCap: 45_000_000_000_000,
  },
  {
    ticker: 'JPM',
    market: 'US',
    sector: 'Financials',
    PE: 11.5,
    PB: 1.8,
    ROE: 15,
    marketCap: 590_000_000_000,
  },
  {
    ticker: 'JNJ',
    market: 'US',
    sector: 'Healthcare',
    PE: 15.2,
    PB: 5.8,
    ROE: 25,
    marketCap: 380_000_000_000,
  },
];

export function evalOp(val: number, op: string, threshold: number): boolean {
  switch (op) {
    case 'gt':
      return val > threshold;
    case 'lt':
      return val < threshold;
    case 'gte':
      return val >= threshold;
    case 'lte':
      return val <= threshold;
    case 'eq':
      return val === threshold;
    default:
      return false;
  }
}

export const screenerTool: ToolDefinition<typeof parameters> = {
  name: 'stock_screener',
  label: '종목 스크리닝',
  description:
    '재무 지표 조건으로 종목을 스크리닝합니다. PE, PB, ROE, 시가총액 등의 조건을 조합하여 투자 후보를 필터링합니다.',
  parameters,
  async execute(_toolCallId, params: Params) {
    const { criteria, market, limit } = params;
    let filtered = MOCK_UNIVERSE;
    if (market) filtered = filtered.filter((s) => s.market === market);
    for (const c of criteria) {
      filtered = filtered.filter((s) => {
        const val = (s as Record<string, unknown>)[c.metric] as number | undefined;
        return val !== undefined && evalOp(val, c.operator, c.value);
      });
    }
    const result = limit ? filtered.slice(0, limit) : filtered;
    return toolResult(JSON.stringify({ matchCount: result.length, stocks: result }));
  },
};
