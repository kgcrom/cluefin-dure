import type { AgentToolUpdateCallback } from '@mariozechner/pi-coding-agent';
import { runBacktestAgent } from '../agents/backtestAgent.js';
import { runCriticAgent } from '../agents/criticAgent.js';
import { runStrategyAgent } from '../agents/strategyAgent.js';
import { ArtifactStore } from '../runtime/artifactStore.js';
import { EventRecorder } from '../runtime/eventRecorder.js';
import { createOnUpdateLogger, log } from '../runtime/log.js';
import type { BacktestResult, CriticReport, StrategyDefinition } from '../schemas/backtest.js';
import { timeoutMinutesToMs } from './backtestTimeout.js';

export interface StrategyResearchOptions {
  theme: string;
  tickers?: string[];
  timeoutMinutes?: number;
}

export interface StrategyResearchResult {
  runId: string;
  strategy: StrategyDefinition;
  backtestResult: BacktestResult;
  criticReport: CriticReport;
}

export async function runStrategyResearch(
  options: StrategyResearchOptions,
  onUpdate?: AgentToolUpdateCallback<null>,
): Promise<StrategyResearchResult> {
  const runId = `strategy-${Date.now()}`;
  const store = new ArtifactStore();
  const recorder = new EventRecorder();
  const emit = onUpdate ? createOnUpdateLogger(onUpdate) : log;

  emit(`\n[run] 전략 리서치 시작: ${runId}`);

  // 1. 전략 설계
  emit('[run] 전략 설계 중...');
  const strategy = await runStrategyAgent(
    runId,
    { theme: options.theme },
    store,
    recorder,
    onUpdate,
  );

  // 2. 백테스트
  const tickers = options.tickers ?? ['005930', '000660', '035420'];
  const backtestTimeoutMs = timeoutMinutesToMs(options.timeoutMinutes);
  emit('[run] 백테스트 실행 중...');
  const backtestResult = await runBacktestAgent(
    runId,
    { strategy, tickers, timeoutMs: backtestTimeoutMs },
    store,
    recorder,
    onUpdate,
  );

  // 3. Critic 검토
  emit('[run] Critic 검토 중...');
  const criticReport = await runCriticAgent(
    runId,
    { strategy, backtestResult },
    store,
    recorder,
    onUpdate,
  );

  await recorder.persist(runId, 'data/runs');
  recorder.dispose();

  emit(`\n[run] 전략 리서치 완료: ${runId}`);
  emit(`[run] Critic 판정: ${criticReport.verdict}`);

  return { runId, strategy, backtestResult, criticReport };
}
