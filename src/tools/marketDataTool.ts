import type { ToolDefinition } from '@mariozechner/pi-coding-agent';
import { type Static, Type } from '@sinclair/typebox';
import { toolResult } from './_helpers.js';

const parameters = Type.Object({
  ticker: Type.String({ description: '종목 코드 (예: AAPL, 005930)' }),
  dataType: Type.Union(
    [Type.Literal('price'), Type.Literal('fundamentals'), Type.Literal('financials')],
    { description: '조회할 데이터 유형' },
  ),
  period: Type.Optional(Type.String({ description: '기간 (예: 1Y, 3M)' })),
});

type Params = Static<typeof parameters>;

const MOCK_DATA: Record<string, Record<string, unknown>> = {
  AAPL: {
    price: { current: 178.5, change: 2.3, volume: 58_000_000, high52w: 199.6, low52w: 143.9 },
    fundamentals: {
      marketCap: 2_800_000_000_000,
      PE: 28.5,
      PB: 45.2,
      ROE: 1.47,
      debtToEquity: 1.76,
      dividendYield: 0.005,
    },
    financials: {
      revenue: 383_285_000_000,
      operatingIncome: 114_301_000_000,
      netIncome: 96_995_000_000,
      operatingMargin: 0.298,
      netMargin: 0.253,
    },
  },
  '005930': {
    price: { current: 72_000, change: -500, volume: 12_000_000, high52w: 88_800, low52w: 59_000 },
    fundamentals: {
      marketCap: 430_000_000_000_000,
      PE: 12.8,
      PB: 1.3,
      ROE: 0.085,
      debtToEquity: 0.35,
      dividendYield: 0.018,
    },
    financials: {
      revenue: 258_935_000_000_000,
      operatingIncome: 6_567_000_000_000,
      netIncome: 15_487_000_000_000,
      operatingMargin: 0.025,
      netMargin: 0.06,
    },
  },
};

export const marketDataTool: ToolDefinition<typeof parameters> = {
  name: 'market_data',
  label: '시장 데이터 조회',
  description:
    '종목의 시세, 재무지표, 재무제표 데이터를 조회합니다. 정확한 수치를 반환하므로 투자 분석의 기초 데이터로 사용하세요.',
  parameters,
  async execute(_toolCallId, params: Params) {
    const { ticker, dataType } = params;
    const tickerData = MOCK_DATA[ticker];
    if (!tickerData) {
      return toolResult(JSON.stringify({ error: `종목 ${ticker}에 대한 데이터가 없습니다.` }));
    }
    const result = tickerData[dataType];
    if (!result) {
      return toolResult(JSON.stringify({ error: `${dataType} 데이터를 찾을 수 없습니다.` }));
    }
    return toolResult(JSON.stringify({ ticker, dataType, data: result }));
  },
};
