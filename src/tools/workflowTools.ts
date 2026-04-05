import type {
  AgentToolResult,
  AgentToolUpdateCallback,
  ToolDefinition,
} from '@mariozechner/pi-coding-agent';
import { type Static, Type } from '@sinclair/typebox';
import { createPiLogSink, type PiLogDetails, withLogSink } from '../runtime/log.js';
import { toolResult } from './_helpers.js';

type WorkflowToolDetails = PiLogDetails & {
  kind: 'workflow-log';
  workflowResult?: unknown;
};

async function runWorkflowTool<T>(
  onUpdate: AgentToolUpdateCallback<WorkflowToolDetails> | undefined,
  runner: () => Promise<T>,
): Promise<{ result: T; details: WorkflowToolDetails }> {
  const logSink = createPiLogSink(onUpdate);
  try {
    const result = await withLogSink(logSink, runner);
    const snapshot = logSink.finish();
    return {
      result,
      details: {
        kind: 'workflow-log',
        ...snapshot,
      },
    };
  } catch (error) {
    logSink.finish();
    throw error;
  }
}

function asWorkflowUpdate(
  onUpdate: AgentToolUpdateCallback<WorkflowToolDetails> | undefined,
): AgentToolUpdateCallback<null> | undefined {
  return onUpdate as unknown as AgentToolUpdateCallback<null> | undefined;
}

// ── run_equity_analysis ──

const equityParams = Type.Object({
  ticker: Type.Optional(Type.String({ description: '종목 코드 (예: 005930, 000660)' })),
  market: Type.Optional(Type.String({ description: '시장 (예: KR, KOSPI)' })),
  style: Type.Optional(Type.String({ description: '투자 스타일 (예: value, growth, quality)' })),
  filterRules: Type.Optional(Type.String({ description: '추가 필터 규칙' })),
});

export const equityAnalysisTool: ToolDefinition<typeof equityParams, WorkflowToolDetails> = {
  name: 'run_equity_analysis',
  label: '종목 종합 분석',
  description:
    '특정 종목의 펀더멘탈, 뉴스, 전략 적합성을 종합 분석합니다. 종목 코드가 주어지면 해당 종목을, 시장/스타일이 주어지면 유니버스를 먼저 구성합니다.',
  parameters: equityParams,
  async execute(_toolCallId, params: Static<typeof equityParams>, _signal, onUpdate) {
    const { runEquityAnalysis } = await import('../workflow/runEquityAnalysis.js');
    const workflowOnUpdate = asWorkflowUpdate(onUpdate);
    const { result, details } = await runWorkflowTool(onUpdate, () =>
      runEquityAnalysis(params, workflowOnUpdate),
    );
    return toolResult(JSON.stringify(result), details);
  },
};

// ── run_screening ──

const screeningParams = Type.Object({
  market: Type.Optional(Type.String({ description: '시장 (예: KR, KOSPI)' })),
  style: Type.Optional(Type.String({ description: '투자 스타일 (예: value, growth)' })),
  filterRules: Type.Optional(Type.String({ description: '스크리닝 필터 규칙' })),
  topN: Type.Optional(Type.Number({ description: '상위 N개 종목 반환 (기본: 10)' })),
});

export const screeningTool: ToolDefinition<typeof screeningParams, WorkflowToolDetails> = {
  name: 'run_screening',
  label: '종목 스크리닝',
  description:
    '시장과 스타일 기준으로 종목을 스크리닝합니다. 펀더멘탈 지표 기반 순위를 매겨 상위 종목을 반환합니다.',
  parameters: screeningParams,
  async execute(_toolCallId, params: Static<typeof screeningParams>, _signal, onUpdate) {
    const { runScreening } = await import('../workflow/runScreening.js');
    const workflowOnUpdate = asWorkflowUpdate(onUpdate);
    const { result, details } = await runWorkflowTool(onUpdate, () =>
      runScreening(params, workflowOnUpdate),
    );
    return toolResult(JSON.stringify(result), details);
  },
};

// ── run_strategy_research ──

const strategyParams = Type.Object({
  theme: Type.String({ description: "전략 테마 또는 가설 (예: '저PER 고ROE 퀄리티 밸류')" }),
  tickers: Type.Optional(Type.Array(Type.String(), { description: '대상 종목 코드 목록' })),
  timeoutMinutes: Type.Optional(
    Type.Number({ minimum: 0, description: '백테스트 제한 시간(분). 기본 7, 0이면 무제한' }),
  ),
});

export const strategyResearchTool: ToolDefinition<typeof strategyParams, WorkflowToolDetails> = {
  name: 'run_strategy_research',
  label: '전략 리서치',
  description: '투자 테마/가설을 기반으로 전략을 설계하고, 백테스트 및 비평 리포트를 생성합니다.',
  parameters: strategyParams,
  async execute(_toolCallId, params: Static<typeof strategyParams>, _signal, onUpdate) {
    const { runStrategyResearch } = await import('../workflow/runStrategyResearch.js');
    const workflowOnUpdate = asWorkflowUpdate(onUpdate);
    const { result, details } = await runWorkflowTool(onUpdate, () =>
      runStrategyResearch(params, workflowOnUpdate),
    );
    return toolResult(JSON.stringify(result), details);
  },
};

const chatStrategyParams = Type.Object({
  theme: Type.String({ description: "전략 테마 또는 가설 (예: '저PER 고ROE 퀄리티 밸류')" }),
  tickers: Type.Optional(Type.Array(Type.String(), { description: '참고할 종목 코드 목록' })),
});

export const chatEquityAnalysisTool: ToolDefinition<typeof equityParams, WorkflowToolDetails> = {
  name: 'run_equity_analysis',
  label: '종목 종합 분석',
  description:
    '특정 종목 또는 조건에 맞는 종목군의 전체 equity 분석을 실행한 뒤, 투자 리뷰 체크리스트까지 자동으로 이어서 검토합니다.',
  parameters: equityParams,
  async execute(_toolCallId, params: Static<typeof equityParams>, _signal, onUpdate) {
    const { runEquityAnalysisChat } = await import('../workflow/runEquityAnalysisChat.js');
    const workflowOnUpdate = asWorkflowUpdate(onUpdate);
    const { result, details } = await runWorkflowTool(onUpdate, () =>
      runEquityAnalysisChat(params, workflowOnUpdate),
    );
    return toolResult(JSON.stringify(result), details);
  },
};

export const chatStrategyResearchTool: ToolDefinition<
  typeof chatStrategyParams,
  WorkflowToolDetails
> = {
  name: 'run_strategy_research',
  label: '전략 초안 생성',
  description:
    '투자 테마/가설을 기반으로 전략 초안을 생성합니다. 대화형 모드에서는 백테스트와 비평을 실행하지 않습니다.',
  parameters: chatStrategyParams,
  async execute(_toolCallId, params: Static<typeof chatStrategyParams>, _signal, onUpdate) {
    const { runStrategyDraft } = await import('../workflow/runStrategyDraft.js');
    const workflowOnUpdate = asWorkflowUpdate(onUpdate);
    const { result, details } = await runWorkflowTool(onUpdate, () =>
      runStrategyDraft(params, workflowOnUpdate),
    );
    return toolResult(JSON.stringify(result), details);
  },
};

// ── run_backtest_loop ──

const backtestLoopParams = Type.Object({
  strategyId: Type.String({ description: '저장된 전략 ID' }),
  timeoutMinutes: Type.Optional(
    Type.Number({ minimum: 0, description: '각 백테스트 제한 시간(분). 기본 7, 0이면 무제한' }),
  ),
});

export const backtestLoopTool: ToolDefinition<typeof backtestLoopParams, WorkflowToolDetails> = {
  name: 'run_backtest_loop',
  label: '백테스트 루프',
  description:
    '저장된 전략을 반복 백테스트합니다. 전략 → 백테스트 → 비평 → 전략 수정 루프를 최대 3회 실행합니다.',
  parameters: backtestLoopParams,
  async execute(
    _toolCallId,
    params: Static<typeof backtestLoopParams>,
    _signal,
    onUpdate,
  ): Promise<AgentToolResult<WorkflowToolDetails>> {
    const { StrategyRepo } = await import('../memory/strategyRepo.js');
    const { runBacktestLoop } = await import('../workflow/runBacktestLoop.js');
    const workflowOnUpdate = asWorkflowUpdate(onUpdate);

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

    const { result, details } = await runWorkflowTool(onUpdate, () =>
      runBacktestLoop(
        {
          strategy: stored.strategy,
          tickers: ['005930', '000660', '035420'],
          maxIterations: 3,
          timeoutMinutes: params.timeoutMinutes,
        },
        workflowOnUpdate,
      ),
    );
    return toolResult(JSON.stringify(result), details);
  },
};

// ── run_scenario_analysis ──

const scenarioParams = Type.Object({
  scenario: Type.String({
    description: '분석할 시나리오 (자연어). 예: "연준이 50bp 긴급 인하하면?"',
  }),
  tickers: Type.Optional(Type.Array(Type.String(), { description: '분석 대상 종목 코드 목록' })),
});

export const scenarioAnalysisTool: ToolDefinition<typeof scenarioParams, WorkflowToolDetails> = {
  name: 'run_scenario_analysis',
  label: '시나리오 분석',
  description:
    'What-if 시나리오를 분석합니다. 가설적 이벤트가 특정 종목/섹터에 미치는 영향을 평가합니다.',
  parameters: scenarioParams,
  async execute(_toolCallId, params: Static<typeof scenarioParams>, _signal, onUpdate) {
    const { runScenarioAnalysis } = await import('../workflow/runScenarioAnalysis.js');
    const workflowOnUpdate = asWorkflowUpdate(onUpdate);
    const { result, details } = await runWorkflowTool(onUpdate, () =>
      runScenarioAnalysis(params, workflowOnUpdate),
    );
    return toolResult(JSON.stringify(result), details);
  },
};

// ── run_review_checklist ──

const reviewChecklistParams = Type.Object({
  runId: Type.String({ description: '리뷰할 기존 equity run ID (예: equity-1712345678901)' }),
});

export const reviewChecklistTool: ToolDefinition<
  typeof reviewChecklistParams,
  WorkflowToolDetails
> = {
  name: 'run_review_checklist',
  label: '투자 리뷰 체크리스트',
  description:
    '기존 equity 분석 run을 불러와 회사 분석, 리스크, 비교기업, 교차검증 체크리스트로 다시 검토합니다.',
  parameters: reviewChecklistParams,
  async execute(_toolCallId, params: Static<typeof reviewChecklistParams>, _signal, onUpdate) {
    const { runReviewChecklist } = await import('../workflow/runReviewChecklist.js');
    const workflowOnUpdate = asWorkflowUpdate(onUpdate);
    const { result, details } = await runWorkflowTool(onUpdate, () =>
      runReviewChecklist({ runId: params.runId }, workflowOnUpdate),
    );
    return toolResult(result.finalReview, {
      ...details,
      workflowResult: result,
    });
  },
};

// ── 전체 도구 목록 ──

export const workflowTools = [
  equityAnalysisTool,
  screeningTool,
  strategyResearchTool,
  backtestLoopTool,
  scenarioAnalysisTool,
] as unknown as ToolDefinition[];

export const chatWorkflowTools = [
  chatEquityAnalysisTool,
  screeningTool,
  chatStrategyResearchTool,
  scenarioAnalysisTool,
  reviewChecklistTool,
] as unknown as ToolDefinition[];
