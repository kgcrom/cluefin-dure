import { runBacktestAgent } from '../agents/backtestAgent.js';
import { runCriticAgent } from '../agents/criticAgent.js';
import { runStrategyAgent } from '../agents/strategyAgent.js';
import { ArtifactStore } from '../runtime/artifactStore.js';
import { EventRecorder } from '../runtime/eventRecorder.js';
import type { BacktestResult, CriticReport, StrategyDefinition } from '../schemas/backtest.js';

export interface StrategyResearchOptions {
  theme: string;
  tickers?: string[];
}

export interface StrategyResearchResult {
  runId: string;
  strategy: StrategyDefinition;
  backtestResult: BacktestResult;
  criticReport: CriticReport;
}

export async function runStrategyResearch(
  options: StrategyResearchOptions,
): Promise<StrategyResearchResult> {
  const runId = `strategy-${Date.now()}`;
  const store = new ArtifactStore();
  const recorder = new EventRecorder();

  console.log(`\n[run] 전략 리서치 시작: ${runId}`);

  // 1. 전략 설계
  console.log('[run] 전략 설계 중...');
  const strategy = await runStrategyAgent(runId, { theme: options.theme }, store, recorder);

  // 2. 백테스트
  const tickers = options.tickers ?? ['AAPL', 'MSFT', '005930'];
  console.log('[run] 백테스트 실행 중...');
  const backtestResult = await runBacktestAgent(runId, { strategy, tickers }, store, recorder);

  // 3. Critic 검토
  console.log('[run] Critic 검토 중...');
  const criticReport = await runCriticAgent(runId, { strategy, backtestResult }, store, recorder);

  await recorder.persist(runId, 'data/runs');
  recorder.dispose();

  console.log(`\n[run] 전략 리서치 완료: ${runId}`);
  console.log(`[run] Critic 판정: ${criticReport.verdict}`);

  return { runId, strategy, backtestResult, criticReport };
}
