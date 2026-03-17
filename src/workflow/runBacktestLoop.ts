import { ArtifactStore } from "../runtime/artifactStore.js";
import { EventRecorder } from "../runtime/eventRecorder.js";
import { runStrategyAgent } from "../agents/strategyAgent.js";
import { runBacktestAgent } from "../agents/backtestAgent.js";
import { runCriticAgent } from "../agents/criticAgent.js";
import type { CriticReport, StrategyDefinition, BacktestResult } from "../schemas/backtest.js";
import type { ExperimentRecord } from "../schemas/signal.js";

export interface BacktestLoopOptions {
  strategy: StrategyDefinition;
  tickers: string[];
  maxIterations?: number;
}

export interface BacktestLoopResult {
  runId: string;
  iterations: ExperimentRecord[];
  finalStrategy: StrategyDefinition;
  finalVerdict: CriticReport["verdict"];
}

export async function runBacktestLoop(options: BacktestLoopOptions): Promise<BacktestLoopResult> {
  const runId = `loop-${Date.now()}`;
  const store = new ArtifactStore();
  const recorder = new EventRecorder();
  const maxIter = options.maxIterations ?? 3;

  console.log(`\n[run] 백테스트 루프 시작: ${runId} (최대 ${maxIter}회)`);

  let currentStrategy = options.strategy;
  const iterations: ExperimentRecord[] = [];

  for (let i = 0; i < maxIter; i++) {
    console.log(`\n[run] === Iteration ${i + 1}/${maxIter} ===`);

    // 1. 백테스트
    console.log("[run] 백테스트 실행 중...");
    const backtestResult: BacktestResult = await runBacktestAgent(
      runId, { strategy: currentStrategy, tickers: options.tickers }, store, recorder
    );

    // 2. Critic 검토
    console.log("[run] Critic 검토 중...");
    const criticReport: CriticReport = await runCriticAgent(
      runId, { strategy: currentStrategy, backtestResult }, store, recorder
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

    console.log(`[run] Critic 판정: ${criticReport.verdict}`);

    // 3. keep이면 종료
    if (criticReport.verdict === "keep") {
      console.log("[run] 전략 승인됨. 루프 종료.");
      break;
    }

    // reject이면 종료
    if (criticReport.verdict === "reject") {
      console.log("[run] 전략 거부됨. 루프 종료.");
      break;
    }

    // 4. revise이면 전략 수정
    if (i < maxIter - 1) {
      console.log("[run] 전략 수정 중...");
      currentStrategy = await runStrategyAgent(runId, {
        theme: currentStrategy.hypothesis,
        feedback: criticReport.recommendations.join("\n"),
      }, store, recorder);
    }
  }

  await recorder.persist(runId, "data/runs");
  recorder.dispose();

  const finalVerdict = iterations[iterations.length - 1]?.criticVerdict ?? "reject";
  console.log(`\n[run] 백테스트 루프 완료: ${runId} (${iterations.length}회 반복, 최종: ${finalVerdict})`);

  return { runId, iterations, finalStrategy: currentStrategy, finalVerdict };
}
