import type { AgentToolUpdateCallback } from '@mariozechner/pi-coding-agent';
import { runBacktestAgent } from '../agents/backtestAgent.js';
import { runCriticAgent } from '../agents/criticAgent.js';
import { runStrategyAgent } from '../agents/strategyAgent.js';
import { ArtifactStore } from '../runtime/artifactStore.js';
import { EventRecorder } from '../runtime/eventRecorder.js';
import { createOnUpdateLogger, log } from '../runtime/log.js';
import type { BacktestResult, CriticReport, StrategyDefinition } from '../schemas/backtest.js';
import type { ExperimentRecord } from '../schemas/signal.js';
import { timeoutMinutesToMs } from './backtestTimeout.js';

export interface BacktestLoopOptions {
  strategy: StrategyDefinition;
  tickers: string[];
  maxIterations?: number;
  timeoutMinutes?: number;
}

export interface BacktestLoopResult {
  runId: string;
  iterations: ExperimentRecord[];
  finalStrategy: StrategyDefinition;
  finalVerdict: CriticReport['verdict'];
}

export async function runBacktestLoop(
  options: BacktestLoopOptions,
  onUpdate?: AgentToolUpdateCallback<null>,
): Promise<BacktestLoopResult> {
  const runId = `loop-${Date.now()}`;
  const store = new ArtifactStore();
  const recorder = new EventRecorder();
  const maxIter = options.maxIterations ?? 3;
  const backtestTimeoutMs = timeoutMinutesToMs(options.timeoutMinutes);
  const emit = onUpdate ? createOnUpdateLogger(onUpdate) : log;

  emit(`\n[run] 백테스트 루프 시작: ${runId} (최대 ${maxIter}회)`);

  let currentStrategy = options.strategy;
  const iterations: ExperimentRecord[] = [];

  for (let i = 0; i < maxIter; i++) {
    emit(`\n[run] === Iteration ${i + 1}/${maxIter} ===`);

    // 1. 백테스트
    emit('[run] 백테스트 실행 중...');
    const backtestResult: BacktestResult = await runBacktestAgent(
      runId,
      { strategy: currentStrategy, tickers: options.tickers, timeoutMs: backtestTimeoutMs },
      store,
      recorder,
      onUpdate,
    );

    // 2. Critic 검토
    emit('[run] Critic 검토 중...');
    const criticReport: CriticReport = await runCriticAgent(
      runId,
      { strategy: currentStrategy, backtestResult },
      store,
      recorder,
      onUpdate,
    );

    // 실험 기록
    const record: ExperimentRecord = {
      id: `${runId}-iter-${i}`,
      strategyId: currentStrategy.name,
      params: currentStrategy.config,
      result: backtestResult,
      criticVerdict: criticReport.verdict,
      timestamp: new Date().toISOString(),
    };
    iterations.push(record);

    emit(`[run] Critic 판정: ${criticReport.verdict}`);

    // 3. keep이면 종료
    if (criticReport.verdict === 'keep') {
      emit('[run] 전략 승인됨. 루프 종료.');
      break;
    }

    // reject이면 종료
    if (criticReport.verdict === 'reject') {
      emit('[run] 전략 거부됨. 루프 종료.');
      break;
    }

    // 4. revise이면 전략 수정
    if (i < maxIter - 1) {
      emit('[run] 전략 수정 중...');
      currentStrategy = await runStrategyAgent(
        runId,
        {
          theme: currentStrategy.hypothesis,
          feedback: criticReport.recommendations.join('\n'),
        },
        store,
        recorder,
        onUpdate,
      );
    }
  }

  await recorder.persist(runId, 'data/runs');
  recorder.dispose();

  const finalVerdict = iterations[iterations.length - 1]?.criticVerdict ?? 'reject';
  emit(`\n[run] 백테스트 루프 완료: ${runId} (${iterations.length}회 반복, 최종: ${finalVerdict})`);

  return { runId, iterations, finalStrategy: currentStrategy, finalVerdict };
}
