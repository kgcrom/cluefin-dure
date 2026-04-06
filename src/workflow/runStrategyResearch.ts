import type { AgentToolUpdateCallback } from '@mariozechner/pi-coding-agent';
import { runStrategyAgent } from '../agents/strategyAgent.js';
import { ArtifactStore } from '../runtime/artifactStore.js';
import { EventRecorder } from '../runtime/eventRecorder.js';
import { createOnUpdateLogger, log } from '../runtime/log.js';
import type { CriticReport, StrategyDefinition } from '../schemas/strategy.js';
import { type CriticIteration, runCriticIterationLoop } from './runCriticIterationLoop.js';

export interface StrategyResearchOptions {
  theme: string;
  tickers?: string[];
  maxIterations?: number;
}

export interface StrategyResearchResult {
  runId: string;
  strategy: StrategyDefinition;
  criticReport: CriticReport;
  criticIterations: CriticIteration[];
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

  // 2. Critic autoresearch (최대 3회 반복)
  const loopResult = await runCriticIterationLoop(
    {
      runId,
      initialStrategy: strategy,
      theme: options.theme,
      maxIterations: options.maxIterations,
    },
    store,
    recorder,
    onUpdate,
  );

  await recorder.persist(runId, 'data/runs');
  recorder.dispose();

  emit(`\n[run] 전략 리서치 완료: ${runId}`);
  const criticReport = loopResult.iterations.at(-1)?.criticReport;
  if (!criticReport) {
    throw new Error('critic 반복 실행 결과가 생성되지 않았습니다.');
  }

  emit(`[run] Critic 판정: ${criticReport.verdict}`);

  return {
    runId,
    strategy: loopResult.finalStrategy,
    criticReport,
    criticIterations: loopResult.iterations,
  };
}
