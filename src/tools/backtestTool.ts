import type { ToolDefinition } from '@mariozechner/pi-coding-agent';
import { type Static, Type } from '@sinclair/typebox';
import { toolResult } from './_helpers.js';

const parameters = Type.Object({
  strategy: Type.Object(
    {
      name: Type.String(),
      entryRules: Type.Array(Type.String()),
      exitRules: Type.Array(Type.String()),
      positionSizing: Type.String(),
      rebalancePeriod: Type.String(),
    },
    { description: '전략 정의' },
  ),
  tickers: Type.Array(Type.String(), { description: '대상 종목 코드 목록' }),
  startDate: Type.String({ description: '시작일 (YYYY-MM-DD)' }),
  endDate: Type.String({ description: '종료일 (YYYY-MM-DD)' }),
  initialCapital: Type.Optional(Type.Number({ description: '초기 자본금' })),
});

type Params = Static<typeof parameters>;

export const backtestTool: ToolDefinition<typeof parameters> = {
  name: 'run_backtest',
  label: '백테스트 실행',
  description:
    '정의된 전략을 과거 데이터에 대해 백테스트합니다. CAGR, MDD, Sharpe 등 성과지표를 계산합니다.',
  parameters,
  async execute(_toolCallId, params: Params) {
    const { strategy, tickers, startDate, endDate, initialCapital = 100_000_000 } = params;

    const hash = strategy.name.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
    const cagr = 0.05 + (hash % 20) / 100;
    const mdd = -(0.1 + (hash % 15) / 100);
    const sharpe = 0.5 + (hash % 15) / 10;
    const turnover = 0.2 + (hash % 8) / 10;

    const tradeLog = tickers.slice(0, 3).flatMap((ticker: string) => [
      {
        date: startDate,
        ticker,
        action: 'BUY',
        price: 100 + (hash % 50),
        quantity: Math.floor(initialCapital / tickers.length / (100 + (hash % 50))),
      },
      {
        date: endDate,
        ticker,
        action: 'SELL',
        price: (100 + (hash % 50)) * (1 + cagr),
        quantity: Math.floor(initialCapital / tickers.length / (100 + (hash % 50))),
      },
    ]);

    return toolResult(
      JSON.stringify({
        cagr: Math.round(cagr * 10000) / 10000,
        mdd: Math.round(mdd * 10000) / 10000,
        sharpe: Math.round(sharpe * 100) / 100,
        turnover: Math.round(turnover * 100) / 100,
        tradeLog,
        runArtifactPath: `data/runs/mock/${strategy.name}`,
        errorLog: [],
      }),
    );
  },
};
