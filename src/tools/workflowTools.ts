import type { ToolDefinition } from '@mariozechner/pi-coding-agent';
import { type Static, Type } from '@sinclair/typebox';
import { toolResult } from './_helpers.js';

// ── run_equity_analysis ──

const equityParams = Type.Object({
  ticker: Type.Optional(Type.String({ description: '종목 코드 (예: AAPL, 005930)' })),
  market: Type.Optional(Type.String({ description: '시장 (예: US, KR)' })),
  style: Type.Optional(Type.String({ description: '투자 스타일 (예: value, growth, quality)' })),
  filterRules: Type.Optional(Type.String({ description: '추가 필터 규칙' })),
});

export const equityAnalysisTool: ToolDefinition<typeof equityParams> = {
  name: 'run_equity_analysis',
  label: '종목 종합 분석',
  description:
    '특정 종목의 펀더멘탈, 뉴스, 전략 적합성을 종합 분석합니다. 종목 코드가 주어지면 해당 종목을, 시장/스타일이 주어지면 유니버스를 먼저 구성합니다.',
  parameters: equityParams,
  async execute(_toolCallId, params: Static<typeof equityParams>) {
    const { runEquityAnalysis } = await import('../workflow/runEquityAnalysis.js');
    const result = await runEquityAnalysis(params);
    return toolResult(JSON.stringify(result));
  },
};

// ── run_screening ──

const screeningParams = Type.Object({
  market: Type.Optional(Type.String({ description: '시장 (예: US, KR)' })),
  style: Type.Optional(Type.String({ description: '투자 스타일 (예: value, growth)' })),
  filterRules: Type.Optional(Type.String({ description: '스크리닝 필터 규칙' })),
  topN: Type.Optional(Type.Number({ description: '상위 N개 종목 반환 (기본: 10)' })),
});

export const screeningTool: ToolDefinition<typeof screeningParams> = {
  name: 'run_screening',
  label: '종목 스크리닝',
  description:
    '시장과 스타일 기준으로 종목을 스크리닝합니다. 펀더멘탈 지표 기반 순위를 매겨 상위 종목을 반환합니다.',
  parameters: screeningParams,
  async execute(_toolCallId, params: Static<typeof screeningParams>) {
    const { runScreening } = await import('../workflow/runScreening.js');
    const result = await runScreening(params);
    return toolResult(JSON.stringify(result));
  },
};

// ── run_strategy_research ──

const strategyParams = Type.Object({
  theme: Type.String({ description: "전략 테마 또는 가설 (예: '저PER 고ROE 퀄리티 밸류')" }),
  tickers: Type.Optional(Type.Array(Type.String(), { description: '대상 종목 코드 목록' })),
});

export const strategyResearchTool: ToolDefinition<typeof strategyParams> = {
  name: 'run_strategy_research',
  label: '전략 리서치',
  description: '투자 테마/가설을 기반으로 전략을 설계하고, 백테스트 및 비평 리포트를 생성합니다.',
  parameters: strategyParams,
  async execute(_toolCallId, params: Static<typeof strategyParams>) {
    const { runStrategyResearch } = await import('../workflow/runStrategyResearch.js');
    const result = await runStrategyResearch(params);
    return toolResult(JSON.stringify(result));
  },
};

// ── run_backtest_loop ──

const backtestLoopParams = Type.Object({
  strategyId: Type.String({ description: '저장된 전략 ID' }),
});

export const backtestLoopTool: ToolDefinition<typeof backtestLoopParams> = {
  name: 'run_backtest_loop',
  label: '백테스트 루프',
  description:
    '저장된 전략을 반복 백테스트합니다. 전략 → 백테스트 → 비평 → 전략 수정 루프를 최대 3회 실행합니다.',
  parameters: backtestLoopParams,
  async execute(_toolCallId, params: Static<typeof backtestLoopParams>) {
    const { StrategyRepo } = await import('../memory/strategyRepo.js');
    const { runBacktestLoop } = await import('../workflow/runBacktestLoop.js');

    const repo = new StrategyRepo();
    const stored = await repo.get(params.strategyId);
    if (!stored) {
      const all = await repo.list();
      const ids = all.map((s) => `${s.id}: ${s.strategy.name}`).join(', ');
      return toolResult(
        JSON.stringify({
          error: `전략 '${params.strategyId}'를 찾을 수 없습니다.`,
          availableStrategies: ids || '저장된 전략이 없습니다.',
        }),
      );
    }

    const result = await runBacktestLoop({
      strategy: stored.strategy,
      tickers: ['AAPL', 'MSFT', '005930'],
      maxIterations: 3,
    });
    return toolResult(JSON.stringify(result));
  },
};

// ── 전체 도구 목록 ──

export const workflowTools = [
  equityAnalysisTool,
  screeningTool,
  strategyResearchTool,
  backtestLoopTool,
] as unknown as ToolDefinition[];
